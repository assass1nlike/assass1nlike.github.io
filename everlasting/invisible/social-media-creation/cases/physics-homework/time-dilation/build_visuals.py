from pathlib import Path
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).parent
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
W, H = 1280, 720
BG, INK, MUTED, CYAN, GOLD = '#071522', '#edf6ff', '#9eb4c7', '#5de0e6', '#ffc777'
FONT = 'C:/Windows/Fonts/msyh.ttc'
FONTS = {}
def font(size):
    if size not in FONTS:
        FONTS[size] = ImageFont.truetype(FONT, size)
    return FONTS[size]
def txt(d, xy, text, size=30, fill=INK):
    d.text(xy, text, font=font(size), fill=fill)
def base(n, title, tag='原理示意'):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 80): d.line((x, 115, x, 580), fill='#102536')
    for y in range(140, 590, 80): d.line((0, y, W, y), fill='#102536')
    txt(d, (55, 27), 'TIME DILATION  /  狭义相对论', 19, CYAN)
    txt(d, (55, 65), title, 43)
    txt(d, (1090, 35), f'{n:02d} / 11', 20, MUTED)
    d.line((55, 133, 1225, 133), fill='#294254', width=2)
    txt(d, (55, 557), tag, 20, MUTED)
    d.rectangle((0, 606, 1280, 720), fill='#050e18')
    return im, d
def panel(d, box): d.rounded_rectangle(box, radius=22, fill='#102a3b', outline='#244556', width=2)
def arrow(d, a, b, color=CYAN, width=4):
    d.line((a,b), fill=color, width=width)
    theta=math.atan2(b[1]-a[1], b[0]-a[0])
    p=[b,(b[0]-16*math.cos(theta-.5),b[1]-16*math.sin(theta-.5)),(b[0]-16*math.cos(theta+.5),b[1]-16*math.sin(theta+.5))]
    d.polygon(p,fill=color)
def save(n, im): im.save(OUT/f'{n:02d}.png')
def clock(d,x,y,r,color):
    d.ellipse((x-r,y-r,x+r,y+r),outline=color,width=5)
    for k in range(12):
        a=k*math.pi/6
        d.line((x+.82*r*math.sin(a),y-.82*r*math.cos(a),x+.93*r*math.sin(a),y-.93*r*math.cos(a)),fill=color,width=3)
    d.line((x,y,x,y-r*.62),fill=color,width=5)
    d.line((x,y,x+r*.5,y+r*.18),fill=color,width=6)
    d.ellipse((x-6,y-6,x+6,y+6),fill=color)

im,d=base(1,'同一段旅程，为什么时间不同？','理想化例子：相对地面匀速运动，忽略引力差异')
panel(d,(65,178,595,520)); panel(d,(685,178,1215,520))
txt(d,(105,208),'地面参考系',28,CYAN); txt(d,(725,208),'飞船上的钟',28,GOLD)
clock(d,195,360,76,CYAN); clock(d,815,360,76,GOLD)
txt(d,(325,285),'10',100,CYAN);txt(d,(920,285),'6',100,GOLD)
txt(d,(420,414),'秒',28);txt(d,(1010,414),'秒',28)
txt(d,(489,485),'v = 0.8c',28); save(1,im)

def light_rest(t):
    im,d=base(3,'光钟：用光的一次往返计时','示意动画｜与光钟一起运动的参考系')
    for y in (280,480): d.rounded_rectangle((277,y-8,473,y+8),radius=6,fill=INK)
    d.line((375,290,375,470),fill='#256976',width=3)
    y=480-200*(1-abs((t/2)%2-1))
    d.ellipse((363,y-12,387,y+12),fill=CYAN)
    arrow(d,(470,465),(470,247),GOLD)
    txt(d,(513,324),'镜面间距  h',30,GOLD)
    txt(d,(755,255),'光速：c',35,CYAN)
    txt(d,(700,340),'一次往返',29)
    txt(d,(700,399),'Δτ = 2h / c',47)
    txt(d,(705,490),'Δτ：钟自身经历的固有时间',23,MUTED)
    return im
save(3,light_rest(1))
def light_moving(t):
    im,d=base(4,'光速相同，斜着走的光需要更久','示意动画｜地面惯性参考系；镜面垂直于运动方向')
    period=20/3; phase=t%period; x=150+80*phase
    y=480-60*phase if phase<period/2 else 280+60*(phase-period/2)
    d.line((150,480,416.667,280,683.334,480),fill='#496573',width=3)
    for my in (280,480): d.rounded_rectangle((x-55,my-6,x+55,my+6),radius=4,fill=INK)
    d.ellipse((x-11,y-11,x+11,y+11),fill=CYAN)
    arrow(d,(170,210),(650,210),GOLD);txt(d,(360,163),'v = 0.8c',30,GOLD)
    txt(d,(815,250),'更长的光路',38,CYAN)
    txt(d,(815,316),'相同的光速',38,CYAN)
    txt(d,(815,417),'更长的滴答间隔',33,GOLD)
    return im
save(4,light_moving(2))

im,d=base(5,'时间膨胀的计算','Δτ：运动钟的固有时间　Δt：地面参考系测得的时间间隔')
panel(d,(68,175,1212,523))
txt(d,(113,194),'由勾股定理： (cΔt / 2)² = h² + (vΔt / 2)²',31,MUTED)
txt(d,(155,276),'Δt = γΔτ',58,CYAN)
txt(d,(640,283),'γ = 1 / √(1 − v²/c²)',40)
d.line((112,379,1165,379),fill='#2c4d5e',width=2)
txt(d,(122,410),'v = 0.8c',35,GOLD);txt(d,(460,410),'γ = 5/3',35,GOLD)
txt(d,(806,410),'10 s = 5/3 × 6 s',32,GOLD);save(5,im)

im,d=base(6,'大气中的天然粒子时钟：μ 子','产生过程示意｜μ 子平均静止寿命 τ₀ ≈ 2.2 μs')
txt(d,(140,160),'来自宇宙的高能粒子',26,CYAN)
arrow(d,(290,204),(420,299),GOLD,5)
d.ellipse((389,275,451,337),fill=GOLD)
txt(d,(489,274),'与大气原子核碰撞',25)
for x in (220,420,620):
    arrow(d,(420,326),(x,444),CYAN,4);txt(d,(x-12,458),'μ',38,CYAN)
panel(d,(815,196,1210,495))
txt(d,(860,233),'平均静止寿命',26,MUTED)
txt(d,(875,315),'2.2',80,CYAN);txt(d,(1080,375),'微秒',26)
txt(d,(847,446),'1 微秒 = 百万分之一秒',21,MUTED);save(6,im)

im,d=base(7,'没有时间膨胀，能飞多远？','cτ₀ ≈ 660 m 是平均距离尺度，不是绝对最远距离')
txt(d,(95,192),'忽略相对论修正',29,MUTED)
txt(d,(97,245),'c × 2.2 μs ≈ 660 m',54,GOLD)
d.rounded_rectangle((100,344,1150,388),radius=12,fill='#142c3c')
d.rounded_rectangle((100,344,169,388),radius=12,fill=GOLD)
txt(d,(95,416),'约 660 m',26,GOLD);txt(d,(917,416),'10 km 尺度',26,CYAN)
txt(d,(98,492),'高空产生的许多 μ 子，却能够到达地面。',34);save(7,im)

im,d=base(8,'接近光速，寿命在地面看来被拉长','理想化计算｜假设匀速 v = 0.998c，未计入大气中的能量损失')
for box in ((65,198,418,504),(462,198,815,504),(859,198,1212,504)):panel(d,box)
for x,title,value,unit in ((98,'时间膨胀因子','15.8','γ'),(495,'地面测得平均寿命','34.8','微秒'),(892,'平均飞行距离','10.4','千米')):
    txt(d,(x,225),title,25,MUTED);txt(d,(x,301),value,68,CYAN);txt(d,(x+200,421),unit,28,GOLD)
save(8,im)

im,d=base(9,'怎样检验？测量大量粒子的衰变','公式示意曲线，非原始实验数据｜N(t) / N₀ = exp[−t / (γτ₀)]')
x0,y0,x1,y1=120,500,880,190
arrow(d,(x0,y0),(x1+20,y0),MUTED,2);arrow(d,(x0,y0),(x0,y1-30),MUTED,2)
txt(d,(72,154),'存活比例',22,MUTED);txt(d,(769,515),'t / τ₀',24,MUTED)
for val in (0,1,2,3,4,5):
    xx=x0+(x1-x0)*val/5;d.line((xx,y0,xx,y0+8),fill=MUTED,width=2);txt(d,(xx-6,y0+12),str(val),18,MUTED)
for gamma,color in ((1,GOLD),(3,CYAN)):
    points=[(x0+(x1-x0)*t/5,y0-(y0-y1)*math.exp(-t/gamma)) for t in np.linspace(0,5,200)]
    d.line(points,fill=color,width=5)
txt(d,(965,242),'γ = 1',31,GOLD);txt(d,(965,316),'γ = 3',31,CYAN)
txt(d,(933,424),'高速 μ 子',26);txt(d,(919,465),'平均寿命更长',25)
save(9,im)

im,d=base(10,'是谁觉得时间变慢？','比较前须校正光信号传播时间；不讨论往返飞行中的加速过程')
panel(d,(65,185,600,510));panel(d,(680,185,1215,510))
clock(d,183,330,71,CYAN);txt(d,(302,238),'自身体验',29,CYAN)
txt(d,(302,310),'心跳正常',32);txt(d,(302,370),'钟表正常',32)
txt(d,(727,232),'跨参考系比较',32,GOLD)
txt(d,(727,322),'时间间隔不同',35);txt(d,(727,398),'并非视觉延迟',30,MUTED)
save(10,im)

im,d=base(11,'时间，不是全宇宙统一的节拍','AI 辅助创作：讲稿、示意图与配音｜实拍来源见画面署名')
for x,label in ((70,'光速不变'),(470,'参考系'),(870,'固有时间')):
    panel(d,(x,180,x+335,300));txt(d,(x+45,212),label,39,CYAN)
txt(d,(80,353),'实拍：Stephen Curry · Cloud Chamber · CC BY 3.0',24)
txt(d,(80,397),'Wikimedia Commons / File:Cloud Chamber.ogv',22,MUTED)
txt(d,(80,441),'实验依据：Bailey 等，Nature 268 (1977)',23)
txt(d,(80,480),'doi.org/10.1038/268301a0',22,MUTED)
save(11,im)

ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for n,fn,duration in ((3,light_rest,4),(4,light_moving,20/3)):
    writer=imageio_ffmpeg.write_frames(str(OUT/f'{n:02d}.mp4'),(W,H),fps=24,codec='libx264',pix_fmt_in='rgb24',quality=8,output_params=['-movflags','+faststart'])
    writer.send(None)
    for i in range(round(duration*24)): writer.send(np.asarray(fn(i/24)))
    writer.close()
print('Generated 10 graphics and 2 light-clock animations.')

im,d=base(2,'看见真实的粒子轨迹','实拍：Stephen Curry · CC BY 3.0｜源片 1/4 速度慢放；截取并裁切')
im.save(OUT/'02-frame.png')
subprocess.run([ffmpeg,'-loglevel','error','-loop','1','-i',str(OUT/'02-frame.png'),'-ss','44','-i',str(OUT/'cloud-chamber.mp4'),'-filter_complex','[1:v]crop=1280:540:0:105,scale=960:405,setsar=1[clip];[0:v][clip]overlay=160:145:shortest=1[v]','-map','[v]','-t','22','-r','24','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(OUT/'02.mp4')],check=True)
print('Prepared credited real cloud-chamber footage.')
