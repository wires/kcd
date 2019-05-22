let R = require('ramda')

let tokenize = R.pipe(
    R.trim,
    R.split(/[ \n\r\t]+/g),
    R.map(parseInt)
)

let d3 = require('d3-scale-chromatic')

let Max = R.reduce((m,x)=>Math.max(m,Math.abs(x)),-1000)

function color(m, k) {
    let u = (1 / m) * (k - 2)
    return d3.interpolateRainbow(u);
}

let s = 24
let p = 6
let spp = (s + p + p)
let pp = p + p

function MonCatIsh (tokens, width) {
    this.tokens = tokens
    this.width = width
    this.height = tokens.length/width
    
    // nr of components
    this.m = Max(tokens)
    
    // index the swaps
    this.swapIdxs = R.compose(
        R.map(([x,y]) => (-tokens[x + y * width])),
        R.filter(R.identity),
        R.map(this.other.bind(this))
    )(R.range(0, this.m + 1))

}

MonCatIsh.prototype.other = function (k) {
    let idx = R.indexOf(-k, this.tokens)
    if (idx < 0) {
        return false
    }
    else {
        let j = Math.floor(idx / this.width)
        let i = idx - (this.width * j)
        return [i,j]
    }
}

MonCatIsh.prototype.is_swap = function (k) {
        return (R.indexOf(k, this.swapIdxs) >= 0)
}

function drawMonCat(mc) {
    let tokens = mc.tokens
    let width = mc.width
    let height = mc.height

    let canvas = document.getElementById('c')
    let ctx = canvas.getContext('2d');
    
    let m = Max(tokens) - 2

    let vline = (x) => {
        ctx.beginPath()
        ctx.moveTo(.5+x, 0)
        ctx.lineTo(.5+x, height * spp)
        ctx.stroke()
    }

    let hline = (y) => {
        ctx.beginPath()
        ctx.moveTo(0, .5+y)
        ctx.lineTo(width * spp, .5+y)
        ctx.stroke()
    }
    
    // grid
    ctx.strokeStyle = 'rgba(10,200,200,0.5)';
    for(let i of R.range(0, width+1)) { vline(i * spp) }
    for(let j of R.range(0, height+1)) { hline(j * spp) }

    for(let i of R.range(0, width)) {
        for(let j of R.range(0, height)) {
            let x = i * spp
            let y = j * spp
            let k = tokens[i + (j*width)]

            ctx.fillText(`${k}`,x+p,y+p)

            switch(k) {
                case 0:
                    break;//return 'rgba(0,150,0,0.1)'
                case 1:
                    ctx.strokeStyle = 'black';
                    ctx.beginPath()
                    ctx.moveTo(.5+x+p+(s/2),.5+y)
                    ctx.lineTo(.5+x+p+(s/2),.5+y+spp)
                    ctx.stroke()
                    break;//return 'rgba(0,0,200,0.2)'
                default:
                    if (mc.is_swap(k) || (k < 0)) {
                        let [i,j] = mc.other(k)
                        let ii = i * spp
                        let jj = j * spp
                        ctx.beginPath()
                        ctx.strokeStyle = 'black';
                        // ctx.strokeStyle = color(m, k)
                        ctx.moveTo(.5+x+p+(s/2),.5+y)
                        ctx.lineTo(.5+ii+p+(s/2),.5+jj+spp)
                        ctx.stroke()
                    }
                    else {
                        ctx.strokeStyle = 'black';
                        ctx.beginPath()
                        ctx.moveTo(.5+x+p+(s/2),.5+y)
                        ctx.lineTo(.5+x+p+(s/2),.5+y+spp)
                        ctx.stroke()
                        ctx.fillStyle = color(m, k)
                        ctx.fillRect(.5+x+p, .5+y+p, s, s)
                        ctx.strokeStyle = 'black'
                        ctx.strokeRect(.5+x+p, .5+y+p, s, s)
                    }
                    break;
            }
        }
    }

}
// let mcd = [4,`
// 1 2  3 1
// 4 5 -5 1
// 1 1 9 -9
// 1 6  7 8
// `]

// let mcd2 = [7,`
//  0 0 0 0  0 0 0
//  0 1 1 1  1 1 0
//  0 1 2 1  3 1 0
//  0 1 4 1 -4 1 0
//  0 1 1 1  1 1 0
//  0 1 5 1  6 1 0
//  0 1 7 1 -7 1 0
//  0 1 1 1  1 1 0
//  0 0 0 0 0 0 0
// `]

function parse(mcd) {
    let tokens = tokenize(mcd[1])
    let width = mcd[0]
    return new MonCatIsh(tokens, width)
}


function changed() {
    let tks = document.getElementById('t').value
    let w = parseInt(document.getElementById('width').value)
    let mc = parse([w,tks])
    console.log('value:', tks,w, mc)
    console.log('tokens:\n\t', R.join(' ', mc.tokens))
    console.log('size (w x h):', mc.width, mc.height)
    console.log('swaps:', mc.swapIdxs.length)
    // dc([t,wh])
    let canvas = document.getElementById('c')
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,1000,1000)
    drawMonCat(mc)
    let hh = mc.height*spp + pp
    ctx.translate(0, hh)
    let z = normalize(mc)
    drawMonCat(z)
    ctx.translate(0, -hh)
}


function normalize(mc) {
    let N = mc.tokens.length
    let w = mc.width
    let h = mc.height
    let tt = R.map(_ => 0,R.range(0,N))
    for(let i of R.range(0,w)) {
        let offset = 0;
        
        let get = (p, q) => {
            let xx = p + offset % w
            let ii = xx + (q * w)
            let k = mc.tokens[ii % mc.tokens.length]
            console.log(`GET (${p},${q}) ~> ${offset} = (${xx},${q})  -->  ${k}`)
            return k
        }
        
        for(let j of R.range(0,h)) {
        
            let k = get(i,j)
            let set = q => { tt[i + j * w] = q }
        
            if (mc.is_swap(k)) {
                let [u,v] = mc.other(k)
                if (v != j) {
                    console.log(u,j,'swap should happen on the same line')
                }
                offset = u - i
                set(1)
            } else {
                if (k < 0) {
                    let [u,v] = mc.other(k)
                    console.log(k,u-i,u,j,offset,'inverse swap')
                    if (v != j) {
                        console.log(u,j,'inverse swap should happen on the same line')
                    }
                    offset = u-i
                    set(1)
                }
                else {
                    console.log('GVD', k)
                    set(k)//get(i, j))
                }
            }
        }
    }
    return new MonCatIsh(tt, mc.width)
}

function onReadyP () {
    let doc = document
    let win = window
    let add = 'addEventListener'
    let remove = 'removeEventListener'
    let loaded = 'DOMContentLoaded'
    let load = 'load'

    return new Promise(function (resolve) {
        if (doc.readyState === 'complete') {
            resolve();
        } else {
            function onReady() {
                resolve();
                doc[remove](loaded, onReady, true);
                win[remove](load, onReady, true);
            }
            doc[add](loaded, onReady, true);
            win[add](load, onReady, true);
        }
    })
}

onReadyP().then(() => {
    changed()
    document.getElementById('b').addEventListener('click', e => {
        console.log('changed')
        changed()
    })
})