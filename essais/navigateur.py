import sys, subprocess, time, json, threading, http.server, socketserver, functools, os
from playwright.sync_api import sync_playwright

PORT = 8123
os.chdir('dist')
H = functools.partial(http.server.SimpleHTTPRequestHandler)
srv = socketserver.TCPServer(('127.0.0.1', PORT), H); srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

msgs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':900,'height':420}, device_scale_factor=1)
    pg.on('console', lambda m: msgs.append((m.type, m.text[:300])))
    pg.on('pageerror', lambda e: msgs.append(('pageerror', str(e)[:400])))
    pg.goto(f'http://127.0.0.1:{PORT}/', wait_until='load')
    pg.wait_for_timeout(1500)
    pg.screenshot(path='../essais/01-menu.png')
    pg.click('#jouer')
    pg.wait_for_timeout(9000)
    pg.screenshot(path='../essais/02-piste.png')
    # accélération au clavier
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(6000)
    v1 = pg.eval_on_selector('#vitesse','e=>e.textContent')
    pg.screenshot(path='../essais/03-roule.png')
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(2500)
    pg.keyboard.up('ArrowRight')
    pg.wait_for_timeout(2500)
    v2 = pg.eval_on_selector('#vitesse','e=>e.textContent')
    etat = pg.evaluate("""()=>{const j=window.__jeu; return {fps:document.getElementById('fps').textContent,
      rapport:document.getElementById('rapport').textContent, chrono:document.getElementById('chrono').textContent,
      tour:document.getElementById('tour').textContent}}""")
    pg.screenshot(path='../essais/04-virage.png')
    pg.click('#btn-camera'); pg.wait_for_timeout(1200)
    pg.screenshot(path='../essais/05-cockpit.png')
    pg.keyboard.up('ArrowUp')
    print('vitesse apres 6s:', v1, ' apres virage:', v2)
    print('etat:', json.dumps(etat))
    b.close()
srv.shutdown()
print('--- console ---')
for t, m in msgs[:25]: print(t, m)
