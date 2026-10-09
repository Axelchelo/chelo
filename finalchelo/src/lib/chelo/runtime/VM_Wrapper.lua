
local function _truthy(v)
    return not not v
end
local function _pack(...)
    return {n = select("#", ...), ...}
end
local function _unpack(t)
    local unpack_fn = table.unpack or unpack
    return unpack_fn(t, 1, t.n or #t)
end
local function _rk(frame, x, const)
    if x >= 256 then return const[x - 255] end
    return frame.stack[x]
end
local function _die()
    error("Chelo Obfuscator: runtime validation failed", 0)
end

local function _exec_super(frame, S, const)
    local op = S.Enum
    local A, B, C = S.A or 0, S.B or 0, S.C or 0
    local function rk(x)
        if x >= 256 then return const[x - 255] end
        return frame.stack[x]
    end
    if op == "Move" then frame.stack[A] = frame.stack[B]
    elseif op == "Loadk" then frame.stack[A] = const[B + 1]
    elseif op == "LoadBool" then frame.stack[A] = (B ~= 0)
    elseif op == "GetGlobal" then frame.stack[A] = (_ENV or _G)[const[B + 1]]
    elseif op == "GetTable" then frame.stack[A] = frame.stack[B][rk(C)]
    elseif op == "SetTable" then frame.stack[A][rk(B)] = rk(C)
    elseif op == "Add" then frame.stack[A] = rk(B) + rk(C)
    elseif op == "Sub" then frame.stack[A] = rk(B) - rk(C)
    elseif op == "Mul" then frame.stack[A] = rk(B) * rk(C)
    elseif op == "Div" then frame.stack[A] = rk(B) / rk(C)
    elseif op == "Mod" then frame.stack[A] = rk(B) % rk(C)
    elseif op == "Pow" then frame.stack[A] = rk(B) ^ rk(C)
    elseif op == "Self" then
        local obj = frame.stack[B]
        frame.stack[A + 1] = obj
        frame.stack[A] = obj[rk(C)]
    elseif op == "Call" then
        local args = {}
        local n = B - 1
        if B == 0 then n = (frame.top or A) - A end
        for j = 1, math.max(n, 0) do args[j] = frame.stack[A + j] end
        local fn = frame.stack[A]
        local ret
        if type(fn) == "function" then
            ret = _pack(fn(_unpack(args)))
        elseif type(fn) == "table" and fn.__vmclosure then
            ret = _pack(VM_Run(fn.chunk, _ENV or _G, fn.upvalues, args))
        else
            _die()
        end
        if C == 0 then
            for j = 1, (ret.n or #ret) do frame.stack[A + j - 1] = ret[j] end
            frame.top = A + (ret.n or #ret) - 1
        else
            for j = 0, C - 2 do frame.stack[A + j] = ret[j + 1] end
        end
    end
end

local function _call(fn, args, env, up)
    if type(fn) == "function" then return _pack(fn(_unpack(args))) end
    if type(fn) == "table" and fn.__vmclosure then return _pack(VM_Run(fn.chunk, env, fn.upvalues, args)) end
    _die()
end

function VM_Run(Chunk, Env, Upvalues, Args)
    do
        local t0 = os.clock()
        local s = 0
        for i = 1, 12000 do s = s + (i % 5) end
        if os.clock() < t0 then _die() end
        if s < 0 then _die() end
    end
    Env = Env or _ENV or _G
    Upvalues = Upvalues or {}
    Args = Args or {}
    local frame = {stack = {}, varargs = {}, top = -1, open_uv = {}}
    for i = 0, (Chunk.ParameterCount or 0) - 1 do frame.stack[i] = Args[i + 1] end
    for i = (Chunk.ParameterCount or 0), (Args.n or #Args) - 1 do frame.varargs[#frame.varargs + 1] = Args[i + 1] end
    frame.varargs.n = math.max((Args.n or #Args) - (Chunk.ParameterCount or 0), 0)
    local pc = 1
    local ins = Chunk.Instructions
    local const = Chunk.Constants
    local function rk(x) return _rk(frame, x, const) end
    local function close_from(a)
        local ou = frame.open_uv
        for i = #ou, 1, -1 do
            local box = ou[i]
            if box and box.reg ~= nil and box.reg >= a then
                local st = (box.frame and box.frame.stack) or frame.stack
                box.value = st[box.reg]
                box.reg = nil
                box.frame = nil
                table.remove(ou, i)
            end
        end
    end
    while true do
        local I = ins[pc]
        if not I then return end
        pc = pc + 1
        local op = I.Enum
        local A, B, C = I.A or 0, I.B or 0, I.C or 0
        if I.Junk or op == "Junk" then
        elseif op == "Super" then
            for _, S in ipairs(I.SuperOps or {}) do _exec_super(frame, S, const) end
        elseif op == "Move" then frame.stack[A] = frame.stack[B]
        elseif op == "Loadk" then frame.stack[A] = const[B + 1]
        elseif op == "LoadBool" then frame.stack[A] = (B ~= 0); if C ~= 0 then pc = pc + 1 end
        elseif op == "LoadNil" then for r = A, B do frame.stack[r] = nil end
        elseif op == "GetUpval" then
            local u = Upvalues[B + 1]
            if type(u) == "table" then
                if u.reg ~= nil and u.frame then frame.stack[A] = u.frame.stack[u.reg] else frame.stack[A] = u.value end
            else frame.stack[A] = u end
        elseif op == "SetUpval" then
            local u = Upvalues[B + 1]
            if type(u) == "table" then
                if u.reg ~= nil and u.frame then u.frame.stack[u.reg] = frame.stack[A] else u.value = frame.stack[A] end
            else Upvalues[B + 1] = frame.stack[A] end
        elseif op == "GetGlobal" then frame.stack[A] = Env[const[B + 1]]
        elseif op == "SetGlobal" then Env[const[B + 1]] = frame.stack[A]
        elseif op == "GetTable" then frame.stack[A] = frame.stack[B][rk(C)]
        elseif op == "SetTable" then frame.stack[A][rk(B)] = rk(C)
        elseif op == "NewTable" then frame.stack[A] = {}
        elseif op == "Self" then local obj = frame.stack[B]; frame.stack[A + 1] = obj; frame.stack[A] = obj[rk(C)]
        elseif op == "Add" then frame.stack[A] = rk(B) + rk(C)
        elseif op == "Sub" then frame.stack[A] = rk(B) - rk(C)
        elseif op == "Mul" then frame.stack[A] = rk(B) * rk(C)
        elseif op == "Div" then frame.stack[A] = rk(B) / rk(C)
        elseif op == "Mod" then frame.stack[A] = rk(B) % rk(C)
        elseif op == "Pow" then frame.stack[A] = rk(B) ^ rk(C)
        elseif op == "Unm" then frame.stack[A] = -frame.stack[B]
        elseif op == "Not" then frame.stack[A] = not frame.stack[B]
        elseif op == "Len" then frame.stack[A] = #frame.stack[B]
        elseif op == "Concat" then
            local s = frame.stack[B]
            for r = B + 1, C do s = s .. frame.stack[r] end
            frame.stack[A] = s
        elseif op == "Jmp" then pc = pc + B
        elseif op == "Eq" then if (rk(B) == rk(C)) ~= (A ~= 0) then pc = pc + 1 end
        elseif op == "Lt" then if (rk(B) < rk(C)) ~= (A ~= 0) then pc = pc + 1 end
        elseif op == "Le" then if (rk(B) <= rk(C)) ~= (A ~= 0) then pc = pc + 1 end
        elseif op == "Test" then if (_truthy(frame.stack[A]) == (C ~= 0)) then pc = pc + 1 end
        elseif op == "TestSet" then
            if (_truthy(frame.stack[B]) == (C ~= 0)) then frame.stack[A] = frame.stack[B] else pc = pc + 1 end
        elseif op == "Call" or op == "TailCall" then
            local args = {}
            local n = B - 1
            if B == 0 then n = frame.top - A end
            for j = 1, math.max(n, 0) do args[j] = frame.stack[A + j] end
            args.n = math.max(n, 0)
            local ret = _call(frame.stack[A], args, Env, Upvalues)
            if C == 0 then
                for j = 1, (ret.n or #ret) do frame.stack[A + j - 1] = ret[j] end
                frame.top = A + (ret.n or #ret) - 1
            else
                for j = 0, C - 2 do frame.stack[A + j] = ret[j + 1] end
            end
            if op == "TailCall" then return _unpack(ret) end
        elseif op == "Return" then
            close_from(0)
            local n = B - 1
            if B == 0 then n = frame.top - A + 1 end
            local ret = {}
            for j = 0, math.max(n, 0) - 1 do ret[j + 1] = frame.stack[A + j] end
            ret.n = math.max(n, 0)
            return _unpack(ret)
        elseif op == "ForPrep" then frame.stack[A] = frame.stack[A] - frame.stack[A + 2]; pc = pc + B
        elseif op == "ForLoop" then
            local idx = frame.stack[A] + frame.stack[A + 2]
            frame.stack[A] = idx
            local lim, step = frame.stack[A + 1], frame.stack[A + 2]
            if (step > 0 and idx <= lim) or (step <= 0 and idx >= lim) then frame.stack[A + 3] = idx; pc = pc + B end
        elseif op == "TForLoop" then
            local ret = _call(frame.stack[A], {frame.stack[A + 1], frame.stack[A + 2]}, Env, Upvalues)
            for j = 1, C do frame.stack[A + 2 + j] = ret[j] end
            if frame.stack[A + 3] ~= nil then frame.stack[A + 2] = frame.stack[A + 3] else pc = pc + 1 end
        elseif op == "SetList" then
            local tbl = frame.stack[A]
            local n = B
            local page = C
            if B == 0 then n = frame.top - A end
            if page == 0 then page = 1 end
            local start = (page - 1) * 50
            for j = 1, n do tbl[start + j] = frame.stack[A + j] end
        elseif op == "Close" then close_from(A)
        elseif op == "Closure" then
            local child = {__vmclosure = true, chunk = Chunk.Prototypes[B + 1], upvalues = {}}
            local need = (child.chunk and child.chunk.UpvalCount) or 0
            for u = 1, need do
                local bind = ins[pc]
                if bind and bind.Enum == "Move" then
                    local box
                    for _, existing in ipairs(frame.open_uv) do
                        if existing.reg == bind.B then box = existing break end
                    end
                    if not box then
                        box = {reg = bind.B, frame = frame}
                        frame.open_uv[#frame.open_uv + 1] = box
                    end
                    child.upvalues[u] = box
                    pc = pc + 1
                elseif bind and bind.Enum == "GetUpval" then
                    child.upvalues[u] = Upvalues[bind.B + 1]
                    pc = pc + 1
                else
                    child.upvalues[u] = {value = nil}
                end
            end
            frame.stack[A] = child
        elseif op == "VarArg" then
            local n = B - 1
            if B == 0 then n = frame.varargs.n or #frame.varargs end
            for j = 1, n do frame.stack[A + j - 1] = frame.varargs[j] end
            frame.top = A + n - 1
        else
            _die()
        end
    end
end

local function Wrap(Chunk, Env, Upvalues, ...)
    local args = {...}
    args.n = select("#", ...)
    return VM_Run(Chunk, Env, Upvalues, args)
end
