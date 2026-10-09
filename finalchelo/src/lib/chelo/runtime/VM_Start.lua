
local ObfuscatorBytecode = |OBFUSCATOR_BYTECODE|;
local Select, Byte, Sub = select, string.byte, string.sub

local function _u32(x) return x % 4294967296 end
local function _xor(a,b)
    local r,p=0,1
    while a>0 or b>0 do
        local aa=a%2; local bb=b%2
        if aa~=bb then r=r+p end
        a=(a-aa)/2; b=(b-bb)/2; p=p*2
    end
    return r
end
local function _and(a,b)
    local r,p=0,1
    while a>0 or b>0 do
        local aa=a%2; local bb=b%2
        if aa==1 and bb==1 then r=r+p end
        a=(a-aa)/2; b=(b-bb)/2; p=p*2
    end
    return r
end
local function _or(a,b) return _u32(a+b-_and(a,b)) end
local function _not(a) return 4294967295-_u32(a) end
local function _shr(a,n) return math.floor(_u32(a)/2^n) end
local function _shl(a,n) return _u32(_u32(a)*2^n) end
local function _ror(a,n) return _or(_shr(a,n),_shl(a,32-n)) end

local function _read32(s,p)
    local a,b,c,d=Byte(s,p,p+3)
    return a+b*256+c*65536+d*16777216,p+4
end
local function _u8(s,p) return Byte(s,p) end
local function _double(raw)
    local b={Byte(raw,1,8)}
    local lo=b[1]+b[2]*256+b[3]*65536+b[4]*16777216
    local hi=b[5]+b[6]*256+b[7]*65536+b[8]*16777216
    local sign=(math.floor(hi/2147483648)%2==1) and -1 or 1
    local exp=math.floor(hi/1048576)%2048
    local frac=(hi%1048576)*4294967296+lo
    if exp==0 then if frac==0 then return sign*0 end; return sign*(2^-1022)*(frac/4503599627370496) end
    if exp==2047 then if frac==0 then return sign*(1/0) end; return 0/0 end
    return sign*(2^(exp-1023))*(1+frac/4503599627370496)
end
local function _base64(s)
    local alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    s=s:gsub("[^"..alphabet.."=]","")
    local out={}
    local bits=""
    for i=1,#s do
        local c=s:sub(i,i)
        if c~="=" then
            local n=(alphabet:find(c,1,true) or 1)-1
            local b=""
            for k=5,0,-1 do b=b..((math.floor(n/2^k)%2)==1 and "1" or "0") end
            bits=bits..b
        end
    end
    for i=1,#bits-7,8 do
        local n=0
        for k=0,7 do n=n*2+(bits:sub(i+k,i+k)=="1" and 1 or 0) end
        out[#out+1]=string.char(n)
    end
    return table.concat(out)
end

-- Pure-Lua SHA-256 used to validate the CHLOV14 body before decoding.
local function _sha256(msg)
    local K={
      1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,
      3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,
      3835390401,4022224774,2643470785,604807628,770255983,1249150122,1555081692,1996064986,
      2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,
      666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,
      2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344
    }
    local H={1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225}
    local n=#msg; local bitlen=n*8; local pad=string.char(128)
    local rem=(56-((n+1)%64))%64
    local hi=math.floor(bitlen/4294967296); local lo=bitlen%4294967296
    local function be32(x) return string.char(math.floor(x/16777216)%256,math.floor(x/65536)%256,math.floor(x/256)%256,x%256) end
    pad=pad..string.rep("\0",rem)..be32(hi)..be32(lo)
    msg=msg..pad
    for off=1,#msg,64 do
        local W={}
        for i=0,15 do
            local p=off+i*4; local a,b,c,d=Byte(msg,p,p+3)
            W[i]=_u32(a*16777216+b*65536+c*256+d)
        end
        for i=16,63 do
            local x=W[i-15]; local y=W[i-2]
            local s0=_xor(_xor(_ror(x,7),_ror(x,18)),_shr(x,3))
            local s1=_xor(_xor(_ror(y,17),_ror(y,19)),_shr(y,10))
            W[i]=_u32(W[i-16]+s0+W[i-7]+s1)
        end
        local a,b,c,d,e,f,g,h=H[1],H[2],H[3],H[4],H[5],H[6],H[7],H[8]
        for i=0,63 do
            local S1=_xor(_xor(_ror(e,6),_ror(e,11)),_ror(e,25))
            local ch=_xor(_and(e,f),_and(_not(e),g))
            local t1=_u32(h+S1+ch+K[i+1]+W[i])
            local S0=_xor(_xor(_ror(a,2),_ror(a,13)),_ror(a,22))
            local maj=_xor(_xor(_and(a,b),_and(a,c)),_and(b,c))
            local t2=_u32(S0+maj)
            h=g; g=f; f=e; e=_u32(d+t1); d=c; c=b; b=a; a=_u32(t1+t2)
        end
        H[1]=_u32(H[1]+a); H[2]=_u32(H[2]+b); H[3]=_u32(H[3]+c); H[4]=_u32(H[4]+d)
        H[5]=_u32(H[5]+e); H[6]=_u32(H[6]+f); H[7]=_u32(H[7]+g); H[8]=_u32(H[8]+h)
    end
    local out={}
    for i=1,8 do local x=H[i]; out[#out+1]=string.char(math.floor(x/16777216)%256,math.floor(x/65536)%256,math.floor(x/256)%256,x%256) end
    return table.concat(out)
end

|V14_RUNTIME|
