"""Render the original educational short with Pillow, NumPy and FFmpeg."""
from pathlib import Path
from tempfile import TemporaryDirectory
import math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'public' / 'art'
w,h,fps,seconds = 640,360,20,14
palette = {'paper':'#f4ead6','ink':'#202d36','orange':'#e89c54','blue':'#61829b','green':'#82a8a1'}
ink,paper = palette['ink'],palette['paper']
font_file = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold_file = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
small = ImageFont.truetype(bold_file,12)
heading = ImageFont.truetype(bold_file,26)
caption = ImageFont.truetype(font_file,17)
scenes = [('Where does a shadow go?', 'Watch the light and the block.'),
          ('Light hits the cube', 'The solid cube blocks some of the light.'),
          ('Move the light', 'The shadow moves to the opposite side.')]
def smooth(t):
    t = min(1,max(0,t))
    return t*t*(3-2*t)
def frame(t):
    img = Image.new('RGB',(w,h),paper); d = ImageDraw.Draw(img)
    idx = 0 if t < 4 else (1 if t < 8 else 2)
    head,sub = scenes[idx]
    d.text((25,18),'VISTORA   /   MOTION STUDIES',font=small,fill='#536864')
    d.text((27,43),head,font=heading,fill=ink)
    d.line((26,87,614,87),fill='#d7ccba')
    d.polygon([(80,268),(316,179),(581,236),(365,295)],fill='#e8d9bf')
    progress = smooth((t-8)/4.2)
    light_x,light_y = int(226+322*progress), int(134-24*math.sin(progress*math.pi))
    tip=int((390-light_x)*.48)
    d.polygon([(338,245),(385,263),(416,251),(416+tip,261),(388+tip,278),(341+tip,259)],fill='#b0a798')
    # Three visible faces of the cube preserve its volume on every frame.
    d.polygon([(338,192),(372,178),(416,194),(383,209)],fill='#cad3c5',outline=ink,width=2)
    d.polygon([(338,192),(383,209),(383,262),(338,244)],fill='#83a9a2' if progress<.62 else '#66848b',outline=ink,width=2)
    d.polygon([(383,209),(416,194),(416,247),(383,262)],fill='#61818a' if progress<.62 else '#96b8a8',outline=ink,width=2)
    # Pointing presenter at the left of the physical demonstration.
    swing = math.sin(t*2.3)*3
    d.ellipse((99,168,127,196),fill='#edc69e',outline=ink,width=4)
    d.ellipse((118,178,121,181),fill=ink)
    d.line([(114,197),(111,227),(96,249),(92,268)],fill=ink,width=5)
    d.line([(111,227),(124,245),(136,260)],fill=ink,width=5)
    d.line([(111,202),(95,213),(85,205)],fill=ink,width=4)
    d.line([(112,202),(129,204),(154,190+swing)],fill=ink,width=4)
    d.line([(90,268),(99,269)],fill=ink,width=4)
    d.line([(135,260),(143,259)],fill=ink,width=4)
    for k in range(8):
        a=k*math.pi/4
        d.line([(light_x+20*math.cos(a),light_y+20*math.sin(a)),(light_x+27*math.cos(a),light_y+27*math.sin(a))],fill='#a36435',width=2)
    d.ellipse((light_x-14,light_y-14,light_x+14,light_y+14),fill='#edb465',outline=ink,width=2)
    if t>=4:
        target=(341,204) if light_x<375 else (415,200)
        for i in range(4,16,2):
            f=i/18;g=(i+1)/18
            d.line([(light_x+(target[0]-light_x)*j,light_y+(target[1]-light_y)*j) for j in (f,g)],fill='#ab8251',width=2)
    d.rounded_rectangle((19,307,621,345),radius=7,fill=ink)
    d.text((320,326),sub,font=caption,anchor='mm',fill=paper)
    return img
def soundtrack(path):
    sr=22050
    sound=np.zeros(sr*seconds)
    for i,beat in enumerate([0,.62,1.26,2.5,3.15,4,4.62,5.26,6.5,7.15,8,8.62,9.26,10.5,11.15,12.05,12.7]):
        freq=[261.626,329.628,391.995,293.665,349.228][i%5]
        duration=.7 if i%3 else 1.05
        ts=np.arange(int(duration*sr))/sr
        env=np.minimum(1,ts/.018)*np.exp(-4.0*ts)*np.minimum(1,(duration-ts)/.08)
        note=(np.sin(2*np.pi*freq*ts)+.26*np.sin(2*np.pi*2*freq*ts))*env*.16
        start=int(beat*sr);sound[start:start+len(note)] += note
    with wave.open(str(path),'wb') as f:
        f.setparams((1,2,sr,0,'NONE','not compressed'));f.writeframes((sound*32767).astype('<i2').tobytes())
if __name__=='__main__':
    with TemporaryDirectory() as temp:
        audio=Path(temp)/'tones.wav';soundtrack(audio)
        command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(fps),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-crf','25','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','48k','-movflags','+faststart',str(out/'example.mp4')]
        with subprocess.Popen(command,stdin=subprocess.PIPE) as proc:
            for n in range(fps*seconds):proc.stdin.write(frame(n/fps).tobytes())
            proc.stdin.close()
            if proc.wait()!=0:raise RuntimeError('Video encoding failed')
    frame(1.5).save(out/'example.webp',quality=87)
