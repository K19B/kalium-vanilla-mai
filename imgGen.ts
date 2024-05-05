import canvas, { loadImage } from 'canvas';
import sharp from 'sharp';

const 
    b50sH = 180,
    b50sW = 338,
    b50sHf = 46,
    b50sWf = 20;

export async function imgGen1
(
    id:     number, diff:  number,
    result: string, combo: number, sync: number,
    top:    number
    /*
    id    : songid
    diff  : 5=ReM 4=MST 3=EXP 2=ADV 1=BSC
    result: like '101.0000'
    combo : 0=none 1=FC 2=FC+ 3=AP 4=AP+
    sync  : 0=none 1=SYNCPLAY 2=FS 3=FS+ 4=FDX 5=FDX+
    top   : 1 to 50
    */
)
{
    const c = canvas.createCanvas(b50sW, b50sH);
    const t = c.getContext('2d');

    // BG
    t.fillStyle = 'black';
    t.fillRect(0, 0, b50sW, b50sH);

    // OUTLINE
    t.fillStyle = 'blue';
    t.fillRect(15, 15, b50sW, b50sH);
    t.fillStyle = '#808080';
    t.fillRect(0, 0, b50sW-15, b50sH-15);

    // RANK
    t.fillStyle = 'yellow';
    t.beginPath();
    t.moveTo(0, b50sH-60);
    t.lineTo(0, b50sH-15);
    t.lineTo(95, b50sH-15);
    t.lineTo(80, b50sH-60);
    t.closePath();
    t.fill();

    // title
    t.font = '30px Sans';
    t.fillStyle = '#fff';
    t.fillText('enchanted wanderer', b50sWf, b50sHf); // test string

    // score
    t.font = '30px Sans';
    t.fillStyle = '#fff';
    t.fillText('101.0000%', b50sWf, b50sHf+50); // test string

    // diff
    t.drawImage(await loadImage('./plugin/kalium-vanilla-mai/assets/diff/bud/master.png'), 50, 50);

    // return
    let buffer = c.toBuffer('image/png');
    return buffer;
}
