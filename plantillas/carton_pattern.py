"""Generate printable A4 SVG templates for the orange forearm armor."""
from pathlib import Path
import argparse

P = argparse.ArgumentParser()
P.add_argument('--length', type=float, default=250, help='armor length in mm')
P.add_argument('--elbow', type=float, default=240, help='forearm circumference near elbow in mm')
P.add_argument('--wrist', type=float, default=180, help='forearm circumference near wrist in mm')
args = P.parse_args()
out = Path(__file__).resolve().parent

def svg(body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
<style>text{{font-family:Arial,sans-serif;fill:#222}} .cut{{fill:none;stroke:#111;stroke-width:.45}} .fold{{fill:none;stroke:#277bb1;stroke-width:.4;stroke-dasharray:3 2}} .guide{{fill:none;stroke:#999;stroke-width:.25;stroke-dasharray:1 1}} .small{{font-size:3.2px}} .label{{font-size:4px;font-weight:bold}}</style>
{body}</svg>'''

def line(x1,y1,x2,y2,cls='cut'):
    return f'<line class="{cls}" x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>'

def poly(points,cls='cut'):
    return '<polygon class="%s" points="%s"/>'%(cls,' '.join(f'{x:.2f},{y:.2f}' for x,y in points))

def txt(x,y,s,cls='small'):
    return f'<text class="{cls}" x="{x}" y="{y}">{s}</text>'

def header(page):
    return txt(10,9,f'ANTEBRAZO NARANJA · PLANTILLA {page}/2 · imprimir A4 al 100%','label')+txt(10,14,'Negro continuo: cortar   /   Azul discontinuo: marcar y doblar   /   Gris: referencia')

def scale():
    return poly([(10,278),(30,278),(30,288),(10,288)])+txt(11,284,'20 mm')

# The shell is deliberately open at the back. Two straps fasten its edges.
# Total developed width is 72% of the measured circumference plus 12 mm clearance.
topw = .72*args.elbow+12
botw = .72*args.wrist+12
if args.length > 250 or topw > 188:
    raise SystemExit('These measurements exceed one A4 sheet. Reduce armor length or print in tiles.')
y0,y1=21,21+args.length
cx=105
ft,fb=.52*topw,.52*botw
lt,lb=(topw-ft)/2,(botw-fb)/2
xt=[cx-topw/2,cx-ft/2,cx+ft/2,cx+topw/2]
xb=[cx-botw/2,cx-fb/2,cx+fb/2,cx+botw/2]
body=header(1)
body+=poly([(xt[0],y0),(xt[3],y0),(xb[3],y1),(xb[0],y1)])
for i in (1,2): body+=line(xt[i],y0,xb[i],y1,'fold')
body+=txt(cx-26,y0+9,'A · CUBIERTA PRINCIPAL','label')
body+=txt(cx-24,y0+15,'Cara exterior: naranja')
body+=txt(xt[0]+2,y0+25,'ala izq.')+txt(xt[2]+2,y0+25,'ala der.')
body+=txt(10,274,f'Largo {args.length:.0f} mm · codo {args.elbow:.0f} mm · muñeca {args.wrist:.0f} mm')+scale()
(out/'antebrazo_plantilla_1_cubierta.svg').write_text(svg(body),encoding='utf-8')

body=header(2)
# Side inset panels, left and right, cut from dark cardboard or painted black.
for n,x in enumerate((22,113),1):
    body+=poly([(x+6,30),(x+31,46),(x+25,194),(x+8,181)])
    body+=txt(x,23,f'B{n} · PANEL OSCURO','label')
    body+=txt(x,204,'Pegar sobre ala lateral')
# Cuff and two rear straps. These are trimmed during fitting.
body+=poly([(20,220),(132,220),(132,242),(20,242)])
body+=txt(23,230,'C · BANDA DE MUÑECA','label')
for n,y in enumerate((250,268),1):
    body+=poly([(46,y),(146,y),(146,y+12),(46,y+12)])
    body+=txt(49,y+8,f'D{n} · TIRA DE CIERRE POSTERIOR')
body+=scale()
(out/'antebrazo_plantilla_2_detalles.svg').write_text(svg(body),encoding='utf-8')
print('SVG templates created in',out)
