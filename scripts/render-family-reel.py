"""Human-centered photo motion film. Generated photographs remain unmodified.
FFmpeg performs motion/compositing; Pillow draws only new typography overlays.
Requires Pillow, edge-tts and FFmpeg. Does not publish anything.
"""
from pathlib import Path
import argparse, asyncio, hashlib, json, math, shutil, struct, subprocess, wave
from PIL import Image, ImageDraw, ImageFont
import edge_tts

ROOT=Path(__file__).resolve().parents[1]
W,H,FPS=1080,1920,24
CREAM='#fff9ec'; PEACH='#e2b487'; GREEN='#244b3d'
def font(size,serif=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('georgia.ttf' if serif else 'segoeui.ttf'),size)
def wrap(d,text,f,width):
    rows=[];row=''
    for word in text.split():
        candidate=(row+' '+word).strip()
        if d.textlength(candidate,font=f)>width and row: rows.append(row);row=word
        else:row=candidate
    if row:rows.append(row)
    return rows
def overlay(scene,path):
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    for y in range(H):
        bottom=max(0,min(1,(y-850)/650))
        top=max(0,1-y/400)*.35
        d.line((0,y,W,y),fill=(12,26,20,round(210*bottom+70*top)))
    d.rounded_rectangle((57,115,292,195),radius=20,fill=(36,75,61,230))
    d.text((76,134),'DaFamília',font=font(35),fill=CREAM)
    d.text((76,1230),scene['label'],font=font(21),fill=PEACH)
    y=1290;f=font(65,True)
    rows=wrap(d,scene['headline'],f,865)
    if len(rows)>4:raise ValueError('Shorten headline to fit safe area')
    for row in rows:d.text((76,y),row,font=f,fill=CREAM);y+=82
    if scene.get('cta'):d.text((76,y+25),scene['cta'],font=font(35),fill=PEACH)
    if scene.get('contact'):
        c=scene['contact'];d.rounded_rectangle((76,966,891,1174),radius=24,fill=(247,246,240,243))
        d.text((106,992),c['name'],font=font(37,True),fill=GREEN)
        d.text((106,1048),c['detail'],font=font(28),fill=GREEN)
        d.text((106,1100),c['context'],font=font(24),fill=GREEN)
    d.text((76,1715),'Cenas ilustrativas com IA · Nova versão em preparação',font=font(21),fill=(224,228,222,255))
    im.save(path)
def run(args):subprocess.run(args,check=True)
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True).strip())
def music(path,seconds):
    rate=44100;chords=[(130.8128,164.8138,195.9977),(110,130.8128,164.8138),(87.3071,110,130.8128),(97.9989,123.4708,146.8324)]
    with wave.open(str(path),'wb') as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);buf=bytearray()
        for i in range(math.ceil(seconds*rate)):
            t=i/rate;chord=chords[int(t/4)%4];beat=t%1;note=chord[int(t)%3]*2
            pad=sum(math.sin(2*math.pi*f*t) for f in chord)/3
            pluck=math.sin(2*math.pi*note*t)*(1-math.exp(-beat*60))*math.exp(-beat*3)
            fade=max(0,min(1,t/2,(seconds-t)/3));v=int(1100*fade*(.6*pad+.7*pluck))
            buf.extend(struct.pack('<h',v))
        out.writeframes(buf)
async def main():
    ap=argparse.ArgumentParser();ap.add_argument('brief',type=Path);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args()
    data=json.loads(a.brief.read_text(encoding='utf-8'));out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
    target=out/(data['slug']+'.mp4')
    if target.exists():raise SystemExit('Previous version preserved: use a new output folder.')
    ffmpeg=shutil.which('ffmpeg');assert ffmpeg
    tracks=[]
    for i,s in enumerate(data['scenes']):
        voice=out/f'voice-{i+1}.mp3'
        if not voice.exists():await edge_tts.Communicate(s['voiceover'],data['voice'],rate='-8%').save(str(voice))
        seconds=max(5.0,math.ceil((duration(voice)+1.0)*FPS)/FPS);frames=round(seconds*FPS)
        layer=out/f'type-{i+1}.png';overlay(s,layer)
        clip=out/f'scene-{i+1}.mp4'
        # Slow optical push; a photograph montage, not claimed to be filmed footage.
        expr=f"[0:v]scale=2160:-2,zoompan=z='1.025+on*0.00016':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s={W}x{H}:fps={FPS},setsar=1[p];[p][1:v]overlay=0:0,fade=t=in:st=0:d=0.3,fade=t=out:st={seconds-.3}:d=0.3[v];[2:a]adelay=300|300,apad,atrim=duration={seconds}[a]"
        run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(ROOT/s['image']),'-i',str(layer),'-i',str(voice),'-filter_complex',expr,'-map','[v]','-map','[a]','-t',str(seconds),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k',str(clip)])
        tracks.append({'file':clip.name,'seconds':seconds,'voiceover':s['voiceover']})
    (out/'concat.txt').write_text(''.join("file '"+t['file']+"'\n" for t in tracks))
    total=sum(t['seconds'] for t in tracks);music(out/'music.wav',total)
    run([ffmpeg,'-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(out/'concat.txt'),'-i',str(out/'music.wav'),'-filter_complex','[0:a]volume=1.4[v];[1:a]volume=0.65[m];[v][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(target)])
    # QA frames are extracted from the actual encoded video, not the layout source.
    at=0
    for i,t in enumerate(tracks):
        run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(at+1.5),'-i',str(target),'-frames:v','1',str(out/f'qa-{i+1}.jpg')]);at+=t['seconds']
    shutil.copyfile(out/'qa-1.jpg',out/'cover.jpg')
    (out/'caption.txt').write_text(data['caption']+'\n',encoding='utf-8')
    manifest={'status':'draft','published':False,'image_source':'Built-in image_gen; fictional people','visual_method':'Photograph montage with FFmpeg motion, not live-action footage','voice_source':'edge-tts, '+data['voice']+'; synthetic narration','music':'Original locally synthesized composition','dimensions':[W,H],'fps':FPS,'seconds':duration(target),'scenes':tracks,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'video':str(target),'seconds':manifest['seconds'],'status':'draft'},ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
