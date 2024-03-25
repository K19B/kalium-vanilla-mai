import canvas from 'canvas';
import sharp from 'sharp';

const 
    b50sH = 180,
    b50sW = 338,
    b50sHf = 48,
    b50sWf = 22;

export async function imgGen1
(
    id:     number, diff:  number,
    result: string, combo: number, sync: number,
    top:    number
)
    /*
    id    : songid
    diff  : 5=ReM 4=MST 3=EXP 2=ADV 1=BSC
    result: like '101.0000'
    combo : 0=none 1=FC 2=FC+ 3=AP 4=AP+
    sync  : 0=none 1=SYNCPLAY 2=FS 3=FS+ 4=FDX 5=FDX+
    top   : 1 to 50
    */
{
    const c = canvas.createCanvas(b50sW, b50sH);
    const t = c.getContext('2d');
    t.fillStyle = 'black';
    t.fillRect(0, 0, b50sW, b50sH);
    t.font = '30px Sans';
    t.fillStyle = '#fff';
    t.fillText('Enchanted Wanderer', b50sWf, b50sHf); // test string
    let buffer = c.toBuffer('image/png');
    return buffer;
}
