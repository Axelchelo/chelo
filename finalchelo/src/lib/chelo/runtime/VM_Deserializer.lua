
local function Deserialize(ByteString)
    local Pos=1
    local function U8() local x=Byte(ByteString,Pos); Pos=Pos+1; return x end
    local function U32() local x; x,Pos=_read32(ByteString,Pos); return x end
    local function Raw(n) local s=Sub(ByteString,Pos,Pos+n-1); Pos=Pos+n; return s end
    local function UString() local n=U32(); return Raw(n) end
    local function xorbytes(s,key,seed)
        local o={}
        for i=1,#s do
            local a=Byte(s,i); local b=key[((seed+i-1)%#key)+1]; o[i]=string.char(_xor(a,b))
        end
        return table.concat(o)
    end
    local function bits(word,def)
        local out={}
        for name,v in pairs(def) do out[name]=math.floor(word/2^v.Start)%2^v.Length end
        return out
    end
    local function chunk()
        local c={UpvalCount=0,ParameterCount=0,VarargCount=0,Constants={},Instructions={},Prototypes={},Upvalues={}}
        local count=U32(); local fields={}
        for _=1,count do local n=U8(); local name=Raw(n); local sz=U32(); fields[name]=Raw(sz) end
        c.UpvalCount=Byte(fields.UpvalCount or "\0",1)
        c.ParameterCount=Byte(fields.ParameterCount or "\0",1)
        c.VarargCount=Byte(fields.VarargCount or "\0",1)
        local cb=fields.Constants; local cp=1; local cc; cc,cp=_read32(cb,cp)
        local revTag={}
        for k,v in pairs(V14.ConstantTags) do revTag[v]=k end
        for i=1,cc do
            local tag=Byte(cb,cp); cp=cp+1; local typ=revTag[tag]
            local v
            if typ=="Nil" then v=nil
            elseif typ=="Boolean" then v=Byte(cb,cp)~=0; cp=cp+1
            elseif typ=="Number" then local n; n,cp=_read32(cb,cp); local raw=Sub(cb,cp,cp+n-1); cp=cp+n; raw=xorbytes(raw,V14.Key,i-1); v=_double(raw)
            elseif typ=="String" then local parts,ns={}; ns,cp=_read32(cb,cp); for j=1,ns do local n; n,cp=_read32(cb,cp); local raw=Sub(cb,cp,cp+n-1); cp=cp+n; parts[#parts+1]=xorbytes(raw,V14.Key,(i-1)+(j-1)) end; v=table.concat(parts)
            else error("bad CHLOV14 constant tag") end
            c.Constants[i]=v
        end
        local ib=fields.Instructions; local ip=1; local ic; ic,ip=_read32(ib,ip)
        local rev={}; for name,id in pairs(V14.OpcodeMap) do rev[id]=name end
        local function signbx(name, f)
            local typ=V14.OpcodeTypes[name] or "ABC"
            if typ=="AsBx" then
                local L=((V14.Registers.AsBx or {}).B or {}).Length or 18
                local sign=2^(L-1)
                if (f.B or 0) >= sign then f.B = (f.B or 0) - 2^L end
            end
            return f
        end
        for i=1,ic do
            local oid; oid,ip=_read32(ib,ip); local word; word,ip=_read32(ib,ip); local junk=_u8(ib,ip); ip=ip+1
            local name=rev[oid]; if not name then error("unknown CHLOV14 opcode") end
            local typ=V14.OpcodeTypes[name] or "ABC"; local f=bits(word,V14.Registers[typ] or V14.Registers.ABC)
            f=signbx(name, f)
            local subs=nil
            if name=="Super" then
                local sc; sc,ip=_read32(ib,ip); subs={}
                for _s=1,sc do
                    local soid; soid,ip=_read32(ib,ip)
                    local sword; sword,ip=_read32(ib,ip)
                    local sname=rev[soid]; if not sname then error("unknown CHLOV14 super opcode") end
                    local styp=V14.OpcodeTypes[sname] or "ABC"
                    local sf=bits(sword, V14.Registers[styp] or V14.Registers.ABC)
                    sf=signbx(sname, sf)
                    subs[#subs+1]={Enum=sname,A=sf.A or 0,B=sf.B or 0,C=sf.C or 0}
                end
            end
            c.Instructions[i]={Enum=name,A=f.A or 0,B=f.B or 0,C=f.C or 0,Junk=(junk~=0),SuperOps=subs}
        end
        local pb=fields.Prototypes; local pp=1; local pc; pc,pp=_read32(pb,pp)
        for i=1,pc do local sz; sz,pp=_read32(pb,pp); local old=ByteString; ByteString=Sub(pb,pp,pp+sz-1); Pos=1; c.Prototypes[i]=chunk(); ByteString=old; pp=pp+sz end
        return c
    end
    return chunk()
end
