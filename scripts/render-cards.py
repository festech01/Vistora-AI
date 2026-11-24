"""Render original geometric movie, portrait and post-analysis illustrations."""
from pathlib import Path
from math import sin, cos, pi
from PIL import Image, ImageDraw
import numpy as np
out=Path(__file__).resolve().parents[1]/'public'/'art'
w,h=800,430
def canvas(start,end):
    y,x=np.mgrid[:h,:w];t=np.clip(.52*x/w+.66*y/h,0,1)[...,None]
    img=(1-t)*np.array(start)+t*np.array(end)
    return Image.fromarray(np.uint8(img))
def save(im,name):
    arr=np.array(im).astype(float)
    arr+=np.random.default_rng(9).normal(0,1.8,(h,w,1))
    Image.fromarray(np.uint8(np.clip(arr,0,255))).resize((640,344),Image.Resampling.LANCZOS).save(out/f'{name}.webp',quality=83)
im=canvas((37,25,89),(157,120,230));d=ImageDraw.Draw(im)
for r in range(110,580,26):
    d.ellipse((500-r,164-r,500+r,164+r),outline='#8670c3',width=1)
for deg in range(0,360,7):
    a=deg*pi/180;d.line((505+150*cos(a),165+150*sin(a),505+550*cos(a),165+550*sin(a)),fill='#7664a9')
cx,cy=422,200
for ox,oy,c,r in [(12,17,'#372755',150),(0,0,'#d3b8ff',150),(0,0,'#a48bd2',143),(0,0,'#cab4ed',136)]:
    d.ellipse((cx+ox-r,cy+oy-r,cx+ox+r,cy+oy+r),fill=c)
for deg in range(0,360,60):
    a=(deg+15)*pi/180;x=cx+91*cos(a);y=cy+91*sin(a);r=33
    d.ellipse((x-r,y-r,x+r,y+r),fill='#685283')
    d.ellipse((x-r+1,y-r+6,x+r-1,y+r),fill='#4e376d')
d.ellipse((cx-21,cy-21,cx+21,cy+21),fill='#8b73b0');d.ellipse((cx-11,cy-11,cx+11,cy+11),fill='#423457')
for i in range(240):
    x=475+i*2;y=308+int(29*sin(i/35))
    d.line((x,y,x,y+32),fill='#382952',width=3)
    if i%7<3:
        d.line((x,y+3,x,y+6),fill='#c9aee4',width=2);d.line((x,y+25,x,y+28),fill='#c9aee4',width=2)
save(im,'film')
im=canvas((247,188,149),(228,109,107));d=ImageDraw.Draw(im)
for r in range(70,560,21):d.ellipse((425-r,178-r,425+r,178+r),outline='#e8a08f',width=2)
# Profiles drawn from a single bespoke contour, overprinted like a screenprint.
pts=[(-110,173),(-94,111),(-65,84),(-54,66),(-62,17),(-77,-27),(-70,-74),(-49,-113),(-13,-138),(33,-142),(69,-130),(97,-105),(105,-76),(102,-52),(115,-37),(108,-29),(129,-8),(130,0),(111,6),(113,17),(103,24),(108,34),(99,39),(97,55),(90,64),(55,64),(42,69),(39,91),(48,112),(91,142),(113,173)]
for dx,dy,fill in [(88,-19,'#d16d69'),(50,-10,'#bb585d'),(0,0,'#813c52'),(-31,16,'#493245')]:
    d.polygon([(420+dx+x,201+dy+y) for x,y in pts],fill=fill)
for dx,dy in [(0,0),(540,0)]:
    for i in range(10):
        x=dx+i*5
        d.line((x,430,x+90,340),fill='#e39283',width=1)
save(im,'portrait')
im=canvas((23,93,99),(123,200,175));d=ImageDraw.Draw(im)
for x in range(0,w,29):d.line((x,0,x,h),fill='#539d93')
for y in range(0,h,29):d.line((0,y,w,y),fill='#539d93')
for off,fill in [(30,'#215862'),(18,'#75ab9d'),(0,'#e0e8ca')]:
    d.rounded_rectangle((217+off,48+off,563+off,350+off),radius=12,fill=fill)
d.rectangle((245,77,533,172),fill='#407b78')
d.polygon([(245,172),(363,95),(451,172)],fill='#88b7a5');d.polygon([(335,172),(469,111),(533,159),(533,172)],fill='#a8c9aa')
d.ellipse((289,91,327,129),fill='#f1cba0')
d.rectangle((248,191,470,211),fill='#215962');d.rectangle((248,221,401,240),fill='#215962')
for i,z in enumerate([192,225,158]):d.rectangle((249,266+i*13,249+z,269+i*13),fill='#75958c')
for ax,ay,bx,by,c in [(232,185,481,246,'#d78861'),(242,75,537,176,'#f2d5a1')]:
    d.rectangle((ax,ay,bx,by),outline=c,width=2)
    for x in (ax,bx):
        for y in (ay,by): d.rectangle((x-4,y-4,x+4,y+4),fill=c)
d.line((482,217,620,217,635,200),fill='#f3cf9c',width=3)
d.ellipse((631,195,641,205),fill='#f3cf9c')
save(im,'post')
