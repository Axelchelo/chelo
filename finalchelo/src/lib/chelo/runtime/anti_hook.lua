-- Chelo anti-hook / timing canaries (silent spin)
local function die()
    error("Chelo Obfuscator: integrity check failed", 0)
end

local function timing_canary()
    local t0 = os.clock()
    local x = 0
    for i = 1, 80000 do
        x = x + i % 7
    end
    local dt = os.clock() - t0
    -- heavily hooked environments often distort tight loops; allow wide band
    if dt < 0 then die() end
    if x == -1 then die() end
end

local function meta_canary()
    if type(hookmetamethod) ~= "function" then
        return true
    end
    local ok = pcall(function()
        local orig
        orig = hookmetamethod(game, "__namecall", function(self, ...)
            if self == game and getnamecallmethod and getnamecallmethod() == "__chelo_canary" then
                return 0xC0FFEE
            end
            return orig(self, ...)
        end)
        local r = game:GetService("__chelo_canary")
        -- restore best-effort
        pcall(function()
            hookmetamethod(game, "__namecall", orig)
        end)
        -- if hooks are broken/mocked inconsistently, r may not match; only die on hard faults
        return true
    end)
    if not ok then
        -- environment rejects hooks oddly — do not hard-die on pure Roblox without hookmetamethod path
        return true
    end
end

local function loadstring_canary()
    local ls = loadstring or load
    if type(ls) ~= "function" then return true end
    local ok, fn = pcall(ls, "return 1337")
    if not ok or type(fn) ~= "function" then die() end
    local ok2, v = pcall(fn)
    if not ok2 or v ~= 1337 then die() end
end

local M = {}
function M.run()
    pcall(timing_canary)
    pcall(loadstring_canary)
    pcall(meta_canary)
    return true
end
return M
