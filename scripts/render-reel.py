"""Original DaFamilia motion graphics. Local assets only; never reads contact data.
Usage: python scripts/render-reel.py content/reel-01.json --output artifacts/social/2026-09-16
Requires Pillow and FFmpeg. Output is a reviewed draft, never auto-published.
"""
from pathlib import Path
import argparse, json, math, shutil, subprocess, wave, struct, hashlib
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
W, H, FPS, DURATION = 720, 1280, 24, 18
GREEN, CREAM, PEACH, MUTED = '#244b3d', '#f7f6f0', '#e2b487', '#a9bcb1'
FONT_DIR = Path('C:/Windows/Fonts')

def font(size, serif=False, bold=False):
    path = FONT_DIR / ('georgia.ttf' if serif else 'segoeuib.ttf' if bold else 'segoeui.ttf')
    return ImageFont.truetype(str(path), size)

def lines(draw, text, face, width):
    out, row = [], ''
    for word in text.split():
        trial = (row+' '+word).strip()
        if draw.textlength(trial, font=face) > width and row:
            out.append(row); row = word
        else: row = trial
    if row: out.append(row)
    return out

def textblock(draw, text, y, size=52, color=GREEN, serif=False, width=592, center=False, bold=False):
    face=font(size,serif,bold)
    for row in lines(draw,text,face,width):
        x=(W-draw.textlength(row,font=face))/2 if center else 64
        draw.text((x,y),row,font=face,fill=color)
        y+=int(size*1.3)
    return y

def mark(image, x, y, size):
    # Same original house-and-heart emblem used by the app.
    d=ImageDraw.Draw(image); k=size/192
    xy=lambda a,b:(x+a*k,y+b*k)
    d.rounded_rectangle((x,y,x+size,y+size),radius=size*.25,fill=GREEN)
    pts=[xy(40,98),xy(96,47),xy(152,98),xy(152,152),xy(40,152),xy(40,98)]
    d.line(pts,fill=CREAM,width=max(1,round(9*k)),joint='curve')
    # Sample a parametric heart into a smooth, deterministic polygon.
    pts=[]
    for n in range(150):
        t=n/149*2*math.pi
        hx=16*math.sin(t)**3
        hy=13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
        pts.append(xy(96+hx*1.8,109-hy*1.6))
    d.polygon(pts,fill=PEACH)

def brand_assets():
    im=Image.new('RGB',(1080,1080),CREAM);mark(im,0,0,1080)
    for size in (192,512):im.resize((size,size),Image.Resampling.LANCZOS).save(ROOT/f'public/logo{size}.png')
    im.resize((64,64),Image.Resampling.LANCZOS).save(ROOT/'public/favicon.ico',sizes=[(16,16),(32,32),(64,64)])
    im.save(ROOT/'content/instagram-avatar.png')
    cover=Image.new('RGB',(1200,630),CREAM);d=ImageDraw.Draw(cover)
    mark(cover,76,84,112);d.text((217,108),'DaFamília',font=font(58,bold=True),fill=GREEN)
    d.text((76,266),'Confiança que',font=font(76,True),fill=GREEN)
    d.text((76,358),'se compartilha.',font=font(76,True),fill=GREEN)
    d.text((80,528),'Os contatos de confiança da sua família, juntos.',font=font(28),fill=GREEN)
    cover.save(ROOT/'public/social-cover.png')

def scene(data,index,t):
    dark=index==3; bg=GREEN if dark else CREAM; fg=CREAM if dark else GREEN
    im=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(im)
    # Gentle orbit and warm circular shapes add movement without obscuring text.
    ox=590+int(15*math.sin(t*.7));oy=195+int(15*math.cos(t*.8))
    d.ellipse((ox-105,oy-105,ox+105,oy+105),fill='#365d4e' if dark else '#eee5d7')
    d.ellipse((-130,1020,220,1370),fill='#365d4e' if dark else '#e5ece4')
    if not dark:mark(im,62,103,54)
    d.text((134 if not dark else 64,108),'DaFamília',font=font(30,bold=True),fill=fg)
    d.text((64,191),'CONFIANÇA QUE SE COMPARTILHA',font=font(17,bold=True),fill=PEACH if dark else GREEN)
    shift=int(20*(1-min(t/0.8,1))**2)
    if index==0:
        y=textblock(d,data['headline'],300+shift,66,fg,True)
        y=textblock(d,data['context'],y+48,30,fg)
        d.rounded_rectangle((64,810,656,997),radius=30,fill='#e5ece4')
        d.text((90,846),'FAMÍLIA',font=font(18,bold=True),fill=GREEN)
        textblock(d,'Uma boa indicação merece um lugar fácil de encontrar.',894,27,fg,width=570,center=True)
    elif index==1:
        textblock(d,'A indicação que você já confia.',276+shift,58,fg,True)
        d.rounded_rectangle((64,524,656,946),radius=32,fill='white',outline='#dbe3d9',width=2)
        d.ellipse((98,560,174,636),fill='#e5ece4');d.text((116,580),'CM',font=font(24,bold=True),fill=GREEN)
        c=data['contact'];d.text((98,666),c['name'],font=font(39,bold=True),fill=GREEN)
        d.text((98,728),c['specialty'],font=font(28),fill='#5d7367')
        d.line((98,788,621,788),fill='#dbe3d9',width=2)
        d.text((98,817),c['by'],font=font(26,bold=True),fill=GREEN)
        for i,row in enumerate(lines(d,c['note'],font(23),514)):
            d.text((98,867+i*31),row,font=font(23),fill='#5d7367')
        d.text((98,970),'Exemplo ilustrativo • contato fictício',font=font(18),fill='#5d7367')
    elif index==2:
        textblock(d,data['solution'],292+shift,62,fg,True)
        for i,(number,title,detail) in enumerate([('01','Guarde','Nome, serviço e quem indicou.'),('02','Compartilhe','Pessoas convidadas, no mesmo grupo.'),('03','Encontre','Busque quando precisar.')]):
            y=614+i*137;d.ellipse((64,y,118,y+54),fill=GREEN);d.text((78,y+13),number,font=font(20,bold=True),fill=CREAM)
            d.text((144,y-1),title,font=font(29,bold=True),fill=GREEN);d.text((144,y+47),detail,font=font(22),fill='#5d7367')
    else:
        textblock(d,'As boas indicações aproximam.',296+shift,68,fg,True)
        textblock(d,data['cta'],628,32,fg)
        d.rounded_rectangle((64,861,656,949),radius=44,fill=PEACH)
        textblock(d,'Acompanhe o DaFamília',881,27,GREEN,center=True,bold=True)
        textblock(d,'Nova versão em preparação',1000,23,MUTED,center=True)
    d.text((64,1130),'CONTATOS • FAMÍLIA • CONFIANÇA',font=font(17,bold=True),fill=MUTED if dark else '#5d7367')
    return im

def soundtrack(path):
    # Original synthesized music, no samples or licensed recordings.
    rate=44100;notes=[220,261.6256,329.6276,293.6648,246.9417,329.6276,261.6256,220]
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate)
        chunk=bytearray()
        for i in range(rate*DURATION):
            t=i/rate;step=int(t/0.75);a=t%0.75;f=notes[step%len(notes)]
            env=(1-math.exp(-a*70))*math.exp(-a*4)
            note=(math.sin(2*math.pi*f*t)+.18*math.sin(4*math.pi*f*t))*env
            pad=.13*(math.sin(2*math.pi*110*t)+math.sin(2*math.pi*164.8138*t))
            fade=min(1,t/1.5,(DURATION-t)/2);value=int(3500*fade*(note+pad))
            chunk.extend(struct.pack('<h',value))
        w.writeframes(chunk)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('brief',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    data=json.loads(args.brief.read_text(encoding='utf-8-sig'))
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    target=out/(data['slug']+'.mp4')
    if target.exists():raise SystemExit('Existing video preserved. Use a new output directory or slug.')
    ffmpeg=shutil.which('ffmpeg');assert ffmpeg,'FFmpeg is required'
    brand_assets();audio=out/'original-soundtrack.wav';soundtrack(audio)
    command=[ffmpeg,'-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(out/(data['slug']+'.rendering.mp4'))]
    process=subprocess.Popen(command,stdin=subprocess.PIPE)
    for frame in range(FPS*DURATION):
        t=frame/FPS;index=min(3,int(t/4.5));local=t-index*4.5
        im=scene(data,index,local)
        if local<.3 and index>0:
            previous=scene(data,index-1,4.5);im=Image.blend(previous,im,local/.3)
        process.stdin.write(im.tobytes())
    process.stdin.close();assert process.wait()==0,'Render failed'
    (out/(data['slug']+'.rendering.mp4')).replace(target)
    scene(data,0,1).save(out/'cover.png')
    grid=Image.new('RGB',(720*2,1280*2),CREAM)
    for index in range(4):grid.paste(scene(data,index,1),(index%2*720,index//2*1280))
    grid.resize((720,1280),Image.Resampling.LANCZOS).save(out/'review-contact-sheet.jpg')
    (out/'caption.txt').write_text(data['caption']+'\n',encoding='utf-8')
    manifest={'status':'draft','source':str(args.brief),'video':target.name,'dimensions':[W,H],'duration_seconds':DURATION,'fps':FPS,'audio':'Original locally synthesized composition; no voice or samples','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'published':False}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__':main()
