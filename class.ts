export class maiScore {
    ranker: string
    score: number
    index: number
    theoryCount: number
    date: Date

    constructor(r: string,
        s: number,
        i: number,
        c: number,
        d: Date) {
        this.ranker = r;
        this.score = s;
        this.index = i;
        this.theoryCount = c;
        this.date = d;
    }
}
export class musicScore
{
    name: string
    level: string
    score: number
    dxScore: number

    constructor(n: string,
                l: string,
                s: number,
                d: number)
    {
        this.name = n;
        this.level = l;
        this.score = s;
        this.dxScore = d;
    }
}