"""Original layered coastal landscape artwork. Run with Pillow and NumPy."""
from pathlib import Path
from math import sin, cos, pi
import random
import numpy as np
from PIL import Image, ImageDraw, ImageOps

out = Path(__file__).resolve().parents[1] / "public" / "art"
out.mkdir(exist_ok=True, parents=True)
w,h = 1440,900
rng = random.Random(42)
noise = np.random.default_rng(43)
yy,xx=np.mgrid[:h,:w]
sky=np.array([[75,67,126],[203,113,133],[255,174,126],[251,209,153],[177,180,164],[78,131,145],[30,84,110]])
stops=[0,.26,.43,.59,.60,.77,1]
img=np.stack([np.interp(yy/h,stops,sky[:,i]) for i in range(3)],-1)
im=Image.fromarray(img.astype('uint8'))
d=ImageDraw.Draw(im)
d.ellipse((850,220,1090,460),fill='#ffda9d')
# Tropical haze and distant cloud banks
for _ in range(100):
    x=rng.randrange(w); y=rng.randrange(65,405); length=rng.randint(25,190)
    color=im.getpixel((x,y))
    col=tuple(min(255,v+q) for v,q in zip(color,(8,5,3)))
    d.polygon([(x,y),(x+length*.7,y-2),(x+length,y+1),(x+length*.45,y+2)],fill=col)
for layer,(base,amp,color) in enumerate([(440,39,'#aa8294'),(475,40,'#8c8395'),(500,22,'#78858c')]):
    pts=[(x,base-amp*(sin(x/130+layer)+.62*cos(x/73+2*layer)+.29*sin(x/35))) for x in range(-3,w+8,5)]
    d.polygon(pts+[(w,548),(0,548)],fill=color)
for k in range(2):
    for x in range(190,w,7+k*3):
        y=rng.randint(492+k*13,525)
        d.rectangle((x,y,x+rng.randint(5,22),550),fill=['#878999','#727f8a'][k])
# Cable-stayed bridge seen across the lagoon
deck='#636a80'
d.line([(380,521),(1420,510)],fill=deck,width=4)
for x in (689,1110):
    base=int(521-(x-380)*.0105)
    d.polygon([(x-8,549),(x-1,base-86),(x+4,base-86),(x+9,549),(x+3,549),(x+1,base-60),(x-4,549)],fill='#696a7b')
    for i in range(1,11):
        for side in (-1,1):
            end=x+side*i*11
            d.line((x+2,base-82+i*2,end,base-int((end-x)*.0105)),fill='#8c8190',width=1)
# reflected color and rippling crosswind
for i in range(3900):
    y=rng.randrange(550,h); x=rng.randrange(w); length=rng.randint(2,max(3,int((y-515)/7)))
    q=abs(x-967)/(32+(y-500)*.8)
    if q<1 and rng.random()<.55*(1-q):
        color=rng.choice(['#e9b291','#efbc97','#f5c799','#c99490'])
    else:
        pix=im.getpixel((x,y))
        shift=rng.randint(-15,14)
        color=tuple(max(0,min(255,n+shift)) for n in pix)
    d.line((x,y,x+length,y),fill=color,width=1 if y<730 else 2)
def boat(x,y,s):
    pts=[(x+u*s,y+v*s) for u,v in [(-52,-2),(-32,5),(27,4),(53,-5),(37,8),(-31,10)]]
    d.polygon(pts, fill='#3a4054');d.line((x-28*s,y+4*s,x+30*s,y+3*s),fill='#ba6c50',width=max(1,int(s*2)))
    d.ellipse((x-3*s,y-20*s,x+3*s,y-14*s),fill='#3c3a49')
    d.polygon([(x-6*s,y),(x-2*s,y-15*s),(x+2*s,y-15*s),(x+7*s,y)],fill='#82564c')
    d.line((x+6*s,y-13*s,x+16*s,y+13*s),fill='#494356',width=max(1,int(s*1.5)))
boat(812,677,1.1);boat(1165,586,.40)
# Foreground cove rocks
for baseline, col, amp in [(655,'#485c69',39),(694,'#354d5a',63),(763,'#233e48',84),(803,'#172e38',110)]:
    poly=[(x,baseline+int((max(x,0)/600)**1.6*205)+rng.uniform(-amp*.08,amp*.08)+amp*.14*sin(x/50)) for x in range(-5,850,5)]
    d.polygon(poly+[(850,h+5),(-5,h+5)],fill=col)
def palm(x,y,height,lean,frond,color):
    top=(x+lean,y-height)
    d.polygon([(x-height*.027,y),(x-height*.008+lean*.35,y-height*.5),(top[0]-height*.011,top[1]),(top[0]+height*.011,top[1]),(x+height*.019+lean*.35,y-height*.5),(x+height*.028,y)],fill=color)
    for a in [-170,-149,-126,-103,-75,-48,-27,-5,13,160]:
        a=(a+rng.uniform(-7,7))*pi/180
        length=frond*rng.uniform(.68,1.13); endx=cos(a)*length; endy=sin(a)*length*.72
        points=[]
        for i in range(55):
            t=i/54; px=top[0]+endx*t; py=top[1]+endy*t+length*.48*t*t
            points.append((px,py))
            if i>2:
                fringe=length*.23*(sin(t*pi)**.6)*rng.uniform(.72,1.13)
                dx=(1 if endx>0 else -1)*fringe*(.62+.55*t)
                for flip in (-.65,1):
                    d.polygon([(px,py),(px+dx*.54,py+flip*fringe*.48),(px+dx,py+flip*fringe+fringe*.20),(px+dx*.40,py+flip*fringe*.46+length*.015)],fill=color)
        d.line(points,fill=color,width=max(1,int(height/115)))
for tup in [(267,666,145,17,69,'#4d6065'),(333,683,170,-12,76,'#415760'),(388,700,122,3,63,'#465b61'),(129,704,235,39,104,'#334b54'),(226,729,216,-25,98,'#334b54'),(37,803,361,100,166,'#243d48'),(85,808,310,89,135,'#29424a'),(-65,826,602,101,231,'#172e38')]:
    palm(*tup)
# Birds curve over the warm horizon
for i in range(12):
    x=490+i*19+rng.randint(-6,5); y=262+int(24*sin(i*.6))+rng.randrange(12)
    size=rng.randint(4,11)
    d.line([(x-size,y-size*.23),(x-size*.45,y-size*.32),(x,y),(x+size*.47,y-size*.38),(x+size,y-size*.40)],fill='#736477',width=2)
arr=np.asarray(im).astype(float)+noise.normal(0,1.4,(h,w,1))
im=Image.fromarray(np.uint8(np.clip(arr,0,255)))
im.save(out/'hero.webp',quality=87,method=6)
ImageOps.fit(im,(768,432)).save(out/'poster.webp',quality=81,method=6)
