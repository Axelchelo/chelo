-- Chelo anti-dump (jerry probes)
local function die()
    error("Chelo Obfuscator: integrity check failed", 0)
end

local function shuffle(t)
    for i = #t, 2, -1 do
        local j = math.random(i)
        t[i], t[j] = t[j], t[i]
    end
    return t
end

-- probe L1:1
local function _p_1_1()
local sv = Instance.new("StringValue")
sv.Name = "__canary"
sv.Value = "safe"
local snap = sv.Value
task.defer(function()
    if sv.Value ~= snap then
        die()
    end
    sv:Destroy()
    return true
end)
end

-- probe L1:2
local function _p_1_2()
local m = Instance.new("Model")
local p = Instance.new("Part")
p.Name = "T"
p.Parent = m
local ov = Instance.new("ObjectValue")
ov.Value = p
ov.Parent = m
local c = m:Clone()
local cp = c:FindFirstChild("T")
local co = c:FindFirstChildOfClass("ObjectValue")
if co.Value == cp and co.Value ~= p then
    return true
else
    die()
end
m:Destroy()
c:Destroy()
end

-- probe L1:3
local function _p_1_3()
local b = Instance.new("BoolValue")
b.Value = true
local changed = false
b.Changed:Connect(function()
    changed = true
end)
task.defer(function()
    if changed then
        die()
    end
    b:Destroy()
    return true
end)
end

-- probe L1:4
local function _p_1_4()
local iv = Instance.new("IntValue")
iv.Value = 12345678
local c = iv:Clone()
if c.Value ~= iv.Value then
    die()
end
iv.Value = 87654321
if c.Value == iv.Value then
    die()
end
iv:Destroy()
c:Destroy()
return true
end

-- probe L1:5
local function _p_1_5()
local nv = Instance.new("NumberValue")
nv.Value = math.pi
task.defer(function()
    if nv.Value ~= math.pi then
        die()
    end
    nv:Destroy()
    return true
end)
end

-- probe L1:6
local function _p_1_6()
local h = Instance.new("Highlight")
local p = Instance.new("Part")
h.Adornee = p
h.FillTransparency = 0.5
local c = h:Clone()
if c.Adornee ~= p then
    die()
end
if math.abs(c.FillTransparency - 0.5) > 0.0001 then
    die()
end
h:Destroy()
c:Destroy()
p:Destroy()
return true
end

-- probe L1:7
local function _p_1_7()
local cl = Instance.new("Clouds")
cl.Density = 0.69
local ex = Instance.new("Explosion")
ex.BlastRadius = 13.37

local cc = cl:Clone()
local ec = ex:Clone()


if math.abs(cc.Density - cl.Density) > 0.0001 then
    die()
end

ex.BlastRadius = 99
if ec.BlastRadius == ex.BlastRadius then
    die()
end

cl:Destroy() cc:Destroy()
ex:Destroy() ec:Destroy()
return true
end

-- probe L1:8
local function _p_1_8()
local rv = Instance.new("ReverbSoundEffect")
rv.DecayTime = 3.75
local eq = Instance.new("EqualizerSoundEffect")
eq.HighGain = -6.5

local rc = rv:Clone()
local ec = eq:Clone()


if math.abs(rc.DecayTime - rv.DecayTime) > 0.0001 then
    die()
end

eq.HighGain = 0
if ec.HighGain == eq.HighGain then
    die()
end

rv:Destroy() rc:Destroy()
eq:Destroy() ec:Destroy()
return true
end

-- probe L1:9
local function _p_1_9()
local fl = Instance.new("FlangeSoundEffect")
fl.Rate = 2.22
local sb = Instance.new("SelectionBox")
sb.LineThickness = 0.08

local fc = fl:Clone()
local sc = sb:Clone()


if math.abs(fc.Rate - fl.Rate) > 0.0001 then
    die()
end

sb.LineThickness = 999
if sc.LineThickness == sb.LineThickness then
    die()
end

fl:Destroy() fc:Destroy()
sb:Destroy() sc:Destroy()
return true
end

-- probe L1:10
local function _p_1_10()
local tr = Instance.new("TremoloSoundEffect")
tr.Frequency = 4.44
local cp = Instance.new("CompressorSoundEffect")
cp.Threshold = -24.0

local tc = tr:Clone()
local cc = cp:Clone()


if math.abs(tc.Frequency - tr.Frequency) > 0.0001 then
    die()
end

cp.Threshold = 0
if cc.Threshold == cp.Threshold then
    die()
end

tr:Destroy() tc:Destroy()
cp:Destroy() cc:Destroy()
return true
end

-- probe L1:11
local function _p_1_11()
local ch = Instance.new("ChorusSoundEffect")
ch.Depth = 0.55
ch.Mix = 0.33
local cc = ch:Clone()

if math.abs(cc.Depth - ch.Depth) > 0.0001 then
    die()
end
ch.Mix = 1
if cc.Mix == ch.Mix then
    die()
end

ch:Destroy() cc:Destroy()
return true
end

-- probe L1:12
local function _p_1_12()
local ae = Instance.new("AudioEcho")
ae.DelayTime = 0.33
ae.Feedback = 0.77
ae.WetLevel = -6.5
local aec = ae:Clone()
ae.DelayTime = 0
if aec.DelayTime == ae.DelayTime then
    die()
end
if math.abs(aec.Feedback - 0.77) > 0.0001 then
    die()
end
ae:Destroy() aec:Destroy()
return true
end

-- probe L1:13
local function _p_1_13()
local ar = Instance.new("AudioReverb")
ar.DecayTime = 4.44
ar.Density = 0.88
ar.WetLevel = -3.5
ar.DryLevel = -6.6
local arc = ar:Clone()
ar.DecayTime = 0
if arc.DecayTime == ar.DecayTime then
    die()
end
if math.abs(arc.Density - 0.88) > 0.0001 then
    die()
end
ar:Destroy() arc:Destroy()
return true
end

-- probe L1:14
local function _p_1_14()
local at = Instance.new("AudioTremolo")
at.Frequency = 7.77
at.Depth = 0.55
at.Duty = 0.33
local atc = at:Clone()
at.Frequency = 0
if atc.Frequency == at.Frequency then
    die()
end
if math.abs(atc.Depth - 0.55) > 0.0001 then
    die()
end
at:Destroy() atc:Destroy()
return true
end

-- probe L1:15
local function _p_1_15()
local ac = Instance.new("AudioCompressor")
ac.Threshold = -24.5
ac.Ratio = 4.44
ac.Attack = 0.88
local acc = ac:Clone()
ac.Threshold = 0
if acc.Threshold == ac.Threshold then
    die()
end
if math.abs(acc.Ratio - 4.44) > 0.0001 then
    die()
end
ac:Destroy() acc:Destroy()
return true
end

-- probe L1:16
local function _p_1_16()
local anim = Instance.new("AnimationConstraint")
anim.AngularDamping = 3.33
anim.LinearDamping = 7.77
anim.AngularStrength = 0.55
local animc = anim:Clone()
anim.AngularDamping = 0
if animc.AngularDamping == anim.AngularDamping then
    die()
end
if math.abs(animc.LinearDamping - 7.77) > 0.0001 then
    die()
end
anim:Destroy() animc:Destroy()
return true
end

-- probe L1:17
local function _p_1_17()
local av = Instance.new("AvatarAbilityRules")
av.EnableClimbing = true
av.EnableCrouching = false
local avc = av:Clone()
av.EnableClimbing = false
if avc.EnableClimbing == av.EnableClimbing then
    die()
end
if avc.EnableCrouching ~= false then
    die()
end
av:Destroy() avc:Destroy()
return true
end

-- probe L1:18
local function _p_1_18()
local wl = Instance.new("WrapLayer")
wl.Order = 5
wl.Enabled = true
local wlc = wl:Clone()
wl.Order = 99
if wlc.Order == wl.Order then
    die()
end
if wlc.Enabled ~= true then
    die()
end
wl:Destroy() wlc:Destroy()
return true
end

-- probe L1:19
local function _p_1_19()
local ad = Instance.new("AccessoryDescription")
ad.AssetId = 123456789
ad.Order = 3
ad.IsLayered = true
local adc = ad:Clone()
ad.AssetId = 0
if adc.AssetId == ad.AssetId then
    die()
end
if adc.IsLayered ~= true then
    die()
end
ad:Destroy() adc:Destroy()
return true
end

-- probe L1:20
local function _p_1_20()
if hookmetamethod then
    local orig
    orig = hookmetamethod(game, "__namecall", function(self, ...)
        if self == game and getnamecallmethod() == "GetService" then
            local args = {...}
            if args[1] == "__canary_svc" then
                return 9999
            end
        end
        return orig(self, ...)
    end)
    local result = game:GetService("__canary_svc")
    if result ~= 9999 then
        die()
    end
    hookmetamethod(game, "__namecall", orig)
end
return true
end

-- probe L1:21
local function _p_1_21()
if hookmetamethod then
    local orig
    orig = hookmetamethod(game, "__index", function(self, key)
        if self == game and key == "__canary_key" then
            return 0xBEEF
        end
        return orig(self, key)
    end)
    local result = game["__canary_key"]
    if result ~= 0xBEEF then
        die()
    end
    hookmetamethod(game, "__index", orig)
end
return true
end

-- probe L2:1
local function _p_2_1()
local p0 = Instance.new("Part")
local p1 = Instance.new("Part")
local a0 = Instance.new("Attachment") a0.Parent = p0
local a1 = Instance.new("Attachment") a1.Parent = p1


local sp = Instance.new("SpringConstraint")
sp.Attachment0 = a0 sp.Attachment1 = a1
sp.Stiffness = 88.8 sp.Damping = 0.25
local sc = sp:Clone()
sp.Stiffness = 1
if sc.Stiffness == sp.Stiffness then
    die()
end


local rp = Instance.new("RopeConstraint")
rp.Attachment0 = a0 rp.Attachment1 = a1
rp.WinchSpeed = 13.37
local rc = rp:Clone()
if math.abs(rc.WinchSpeed - rp.WinchSpeed) > 0.0001 then
    die()
end


local hc = Instance.new("HingeConstraint")
hc.Attachment0 = a0 hc.Attachment1 = a1
hc.UpperAngle = 45.0 hc.LowerAngle = -45.0
local hcc = hc:Clone()
if hcc.Attachment0 ~= a0 or hcc.Attachment1 ~= a1 then
    die()
end


local ap = Instance.new("AlignPosition")
ap.Attachment0 = a0 ap.Attachment1 = a1
ap.Responsiveness = 7.77 ap.MaxVelocity = 50.0
local apc = ap:Clone()
ap.Responsiveness = 200
if apc.Responsiveness == ap.Responsiveness then
    die()
end


local wc = Instance.new("WeldConstraint")
wc.Part0 = p0 wc.Part1 = p1
local wcc = wc:Clone()
if wcc.Part0 ~= p0 or wcc.Part1 ~= p1 then
    die()
end
wc.Part0 = p1
if wcc.Part0 == wc.Part0 then
    die()
end

sp:Destroy() sc:Destroy()
rp:Destroy() rc:Destroy()
hc:Destroy() hcc:Destroy()
ap:Destroy() apc:Destroy()
wc:Destroy() wcc:Destroy()
p0:Destroy() p1:Destroy()
return true
end

-- probe L2:2
local function _p_2_2()
local p0 = Instance.new("Part")
local p1 = Instance.new("Part")
local a0 = Instance.new("Attachment") a0.Parent = p0
local a1 = Instance.new("Attachment") a1.Parent = p1

local lv = Instance.new("LinearVelocity")
lv.Attachment0 = a0
lv.LineVelocity = 5.55
lv.MaxForce = 100.0
local lvc = lv:Clone()
lv.LineVelocity = 999
if lvc.LineVelocity == lv.LineVelocity then
    die()
end

local av = Instance.new("AngularVelocity")
av.Attachment0 = a0
av.MaxTorque = 33.3
local avc = av:Clone()
if math.abs(avc.MaxTorque - av.MaxTorque) > 0.0001 then
    die()
end

local ao = Instance.new("AlignOrientation")
ao.Attachment0 = a0 ao.Attachment1 = a1
ao.Responsiveness = 9.99
local aoc = ao:Clone()
ao.Responsiveness = 1
if aoc.Responsiveness == ao.Responsiveness then
    die()
end

local nc = Instance.new("NoCollisionConstraint")
nc.Part0 = p0 nc.Part1 = p1
local ncc = nc:Clone()
if ncc.Part0 ~= p0 or ncc.Part1 ~= p1 then
    die()
end
nc.Part0 = p1
if ncc.Part0 == nc.Part0 then
    die()
end

local rc = Instance.new("RigidConstraint")
rc.Attachment0 = a0 rc.Attachment1 = a1
local rcc = rc:Clone()
if rcc.Attachment0 ~= a0 or rcc.Attachment1 ~= a1 then
    die()
end

lv:Destroy() lvc:Destroy()
av:Destroy() avc:Destroy()
ao:Destroy() aoc:Destroy()
nc:Destroy() ncc:Destroy()
rc:Destroy() rcc:Destroy()
p0:Destroy() p1:Destroy()
return true
end

-- probe L2:3
local function _p_2_3()
local p = Instance.new("Part")
local a0 = Instance.new("Attachment") a0.Parent = p
local a1 = Instance.new("Attachment") a1.Parent = p

local pe = Instance.new("ParticleEmitter") pe.Parent = p
pe.Rate = 44.4
pe.Drag = 0.88
pe.LightEmission = 0.55
pe.VelocityInheritance = 0.33
local pec = pe:Clone()
pe.Rate = 999
if pec.Rate == pe.Rate then
    die()
end

local tr = Instance.new("Trail")
tr.Attachment0 = a0 tr.Attachment1 = a1
tr.Lifetime = 2.75
tr.MaxLength = 50.0
local trc = tr:Clone()
if math.abs(trc.Lifetime - tr.Lifetime) > 0.0001 then
    die()
end
tr.Lifetime = 0
if trc.Lifetime == tr.Lifetime then
    die()
end

local pl = Instance.new("PointLight") pl.Parent = p
pl.Range = 16.5
pl.Brightness = 3.3
local plc = pl:Clone()
pl.Range = 1
if plc.Range == pl.Range then
    die()
end

local sl = Instance.new("SpotLight") sl.Parent = p
sl.Angle = 75.0
sl.Range = 22.2
local slc = sl:Clone()
if math.abs(slc.Angle - sl.Angle) > 0.0001 then
    die()
end

local bb = Instance.new("BillboardGui") bb.Parent = p
bb.MaxDistance = 100.0
bb.Brightness = 1.5
local bbc = bb:Clone()
bb.MaxDistance = 0
if bbc.MaxDistance == bb.MaxDistance then
    die()
end

pe:Destroy() pec:Destroy()
tr:Destroy() trc:Destroy()
pl:Destroy() plc:Destroy()
sl:Destroy() slc:Destroy()
bb:Destroy() bbc:Destroy()
p:Destroy()
return true
end

-- probe L2:4
local function _p_2_4()
local p = Instance.new("Part")

local snd = Instance.new("Sound") snd.Parent = p
snd.Volume = 0.77
snd.PlaybackSpeed = 1.25
snd.RollOffMaxDistance = 88.8
local sndc = snd:Clone()
snd.Volume = 0
if sndc.Volume == snd.Volume then
    die()
end

local dc = Instance.new("Decal") dc.Parent = p
dc.Transparency = 0.44
dc.Rotation = 33.3
local dcc = dc:Clone()
if math.abs(dcc.Transparency - dc.Transparency) > 0.0001 then
    die()
end
dc.Rotation = 0
if dcc.Rotation == dc.Rotation then
    die()
end

local tx = Instance.new("Texture") tx.Parent = p
tx.StudsPerTileU = 4.5
tx.StudsPerTileV = 6.6
tx.OffsetStudsU = 1.11
local txc = tx:Clone()
tx.StudsPerTileU = 1
if txc.StudsPerTileU == tx.StudsPerTileU then
    die()
end

local atm = Instance.new("Atmosphere")
atm.Density = 0.35
atm.Haze = 2.75
atm.Glare = 0.12
local atmc = atm:Clone()
if math.abs(atmc.Haze - atm.Haze) > 0.0001 then
    die()
end
atm.Density = 1
if atmc.Density == atm.Density then
    die()
end

snd:Destroy() sndc:Destroy()
dc:Destroy() dcc:Destroy()
tx:Destroy() txc:Destroy()
atm:Destroy() atmc:Destroy()
p:Destroy()
return true
end

-- probe L2:5
local function _p_2_5()
local p = Instance.new("Part")

local pp = Instance.new("ProximityPrompt") pp.Parent = p
pp.MaxActivationDistance = 12.5
pp.HoldDuration = 0.75
pp.ActionText = "canary"
local ppc = pp:Clone()
pp.MaxActivationDistance = 999
if ppc.MaxActivationDistance == pp.MaxActivationDistance then
    die()
end
if ppc.ActionText ~= "canary" then
    die()
end

local cd = Instance.new("ClickDetector") cd.Parent = p
cd.MaxActivationDistance = 32.0
local cdc = cd:Clone()
if math.abs(cdc.MaxActivationDistance - cd.MaxActivationDistance) > 0.0001 then
    die()
end
cd.MaxActivationDistance = 0
if cdc.MaxActivationDistance == cd.MaxActivationDistance then
    die()
end

local dd = Instance.new("DragDetector") dd.Parent = p
dd.MaxForce = 55.5
dd.Responsiveness = 8.88
dd.MaxDragAngle = 45.0
local ddc = dd:Clone()
dd.MaxForce = 1
if ddc.MaxForce == dd.MaxForce then
    die()
end
if math.abs(ddc.Responsiveness - 8.88) > 0.0001 then
    die()
end

pp:Destroy() ppc:Destroy()
cd:Destroy() cdc:Destroy()
dd:Destroy() ddc:Destroy()
p:Destroy()
return true
end

-- probe L2:6
local function _p_2_6()
local p = Instance.new("Part")

local fi = Instance.new("Fire") fi.Parent = p
fi.Heat = 9.99
fi.Size = 5.55
local fic = fi:Clone()
fi.Heat = 1
if fic.Heat == fi.Heat then
    die()
end
if math.abs(fic.Size - 5.55) > 0.0001 then
    die()
end

local sm = Instance.new("Smoke") sm.Parent = p
sm.Opacity = 0.66
sm.RiseVelocity = 4.44
sm.Size = 3.33
local smc = sm:Clone()
sm.Opacity = 0
if smc.Opacity == sm.Opacity then
    die()
end
if math.abs(smc.RiseVelocity - 4.44) > 0.0001 then
    die()
end

local sp = Instance.new("Sparkles") sp.Parent = p
sp.TimeScale = 0.88
local spc = sp:Clone()
sp.TimeScale = 0
if spc.TimeScale == sp.TimeScale then
    die()
end

local lasso = Instance.new("SelectionPointLasso")
lasso.Point = Vector3.new(1.11, 2.22, 3.33)
local lassoc = lasso:Clone()
if lassoc.Point ~= lasso.Point then
    die()
end
lasso.Point = Vector3.new(0, 0, 0)
if lassoc.Point == lasso.Point then
    die()
end

fi:Destroy() fic:Destroy()
sm:Destroy() smc:Destroy()
sp:Destroy() spc:Destroy()
lasso:Destroy() lassoc:Destroy()
p:Destroy()
return true
end

-- probe L2:7
local function _p_2_7()
local p = Instance.new("Part")

local bv = Instance.new("BodyVelocity") bv.Parent = p
bv.P = 12500.5
bv.Velocity = Vector3.new(1.1, 2.2, 3.3)
local bvc = bv:Clone()
bv.P = 1
if bvc.P == bv.P then
    die()
end
if bvc.Velocity ~= Vector3.new(1.1, 2.2, 3.3) then
    die()
end

local bp = Instance.new("BodyPosition") bp.Parent = p
bp.P = 9999.9
bp.D = 1500.5
bp.Position = Vector3.new(5.5, 6.6, 7.7)
local bpc = bp:Clone()
bp.D = 0
if bpc.D == bp.D then
    die()
end
if math.abs(bpc.P - 9999.9) > 0.001 then
    die()
end

local bg = Instance.new("BodyGyro") bg.Parent = p
bg.P = 3000.3
bg.D = 500.5
local bgc = bg:Clone()
bg.P = 0
if bgc.P == bg.P then
    die()
end
if math.abs(bgc.D - 500.5) > 0.001 then
    die()
end

local bf = Instance.new("BodyForce") bf.Parent = p
bf.Force = Vector3.new(10.1, 20.2, 30.3)
local bfc = bf:Clone()
bf.Force = Vector3.new(0, 0, 0)
if bfc.Force == bf.Force then
    die()
end

bv:Destroy() bvc:Destroy()
bp:Destroy() bpc:Destroy()
bg:Destroy() bgc:Destroy()
bf:Destroy() bfc:Destroy()
p:Destroy()
return true
end

-- probe L2:8
local function _p_2_8()
local cv = Instance.new("CFrameValue")
cv.Value = CFrame.new(1.11, 2.22, 3.33)
local cvc = cv:Clone()
cv.Value = CFrame.new(0, 0, 0)
if cvc.Value == cv.Value then
    die()
end
if cvc.Value ~= CFrame.new(1.11, 2.22, 3.33) then
    die()
end

local v3 = Instance.new("Vector3Value")
v3.Value = Vector3.new(9.99, 8.88, 7.77)
local v3c = v3:Clone()
if v3c.Value ~= Vector3.new(9.99, 8.88, 7.77) then
    die()
end
v3.Value = Vector3.new(0, 0, 0)
if v3c.Value == v3.Value then
    die()
end

local c3 = Instance.new("Color3Value")
c3.Value = Color3.fromRGB(123, 45, 67)
local c3c = c3:Clone()
c3.Value = Color3.fromRGB(0, 0, 0)
if c3c.Value == c3.Value then
    die()
end
if c3c.Value ~= Color3.fromRGB(123, 45, 67) then
    die()
end

local sv = Instance.new("StringValue")
sv.Value = "sentinel_xyz_987"
local svc = sv:Clone()
sv.Value = ""
if svc.Value == sv.Value then
    die()
end
if svc.Value ~= "sentinel_xyz_987" then
    die()
end

cv:Destroy() cvc:Destroy()
v3:Destroy() v3c:Destroy()
c3:Destroy() c3c:Destroy()
sv:Destroy() svc:Destroy()
return true
end

-- probe L2:9
local function _p_2_9()
local sg = Instance.new("ScreenGui")

local tl = Instance.new("TextLabel") tl.Parent = sg
tl.Text = "canary_tl_777"
tl.TextSize = 24.5
tl.TextTransparency = 0.33
tl.LineHeight = 1.44
local tlc = tl:Clone()
tl.Text = ""
if tlc.Text == tl.Text then
    die()
end
tl.TextSize = 1
if tlc.TextSize == tl.TextSize then
    die()
end

local tb = Instance.new("TextBox") tb.Parent = sg
tb.PlaceholderText = "canary_tb_888"
tb.TextSize = 18.8
tb.LineHeight = 1.22
tb.TextTransparency = 0.55
local tbc = tb:Clone()
tb.PlaceholderText = ""
if tbc.PlaceholderText == tb.PlaceholderText then
    die()
end
if math.abs(tbc.LineHeight - 1.22) > 0.0001 then
    die()
end

local sf = Instance.new("ScrollingFrame") sf.Parent = sg
sf.ScrollBarThickness = 12
sf.ScrollBarImageTransparency = 0.77
local sfc = sf:Clone()
sf.ScrollBarThickness = 0
if sfc.ScrollBarThickness == sf.ScrollBarThickness then
    die()
end
if math.abs(sfc.ScrollBarImageTransparency - 0.77) > 0.0001 then
    die()
end

local il = Instance.new("ImageLabel") il.Parent = sg
il.ImageTransparency = 0.44
il.SliceScale = 2.22
local ilc = il:Clone()
il.SliceScale = 0
if ilc.SliceScale == il.SliceScale then
    die()
end
if math.abs(ilc.ImageTransparency - 0.44) > 0.0001 then
    die()
end

sg:Destroy()
return true
end

-- probe L3:1
local function _p_3_1()
local findings = {}
local function die() table.insert(findings, "probe validation failed") end

local f1 = Instance.new("Folder")
f1:SetAttribute("__x", 3.14159)
f1:SetAttribute("__s", "poison")
local f1c = f1:Clone()
f1:SetAttribute("__x", 999)
f1:SetAttribute("__s", "mutated")
if f1c:GetAttribute("__x") == f1:GetAttribute("__x") then die() end
if f1c:GetAttribute("__s") == f1:GetAttribute("__s") then die() end
if f1c:GetAttribute("__x") == nil then die() end
f1:Destroy() f1c:Destroy()

local f2 = Instance.new("Folder")
f2:AddTag("__canary_lv3")
f2:AddTag("__canary_lv3_b")
local f2c = f2:Clone()
if not f2c:HasTag("__canary_lv3") then die() end
if not f2c:HasTag("__canary_lv3_b") then die() end
local tags = f2c:GetTags()
local count = 0
for _, t in ipairs(tags) do
    if t == "__canary_lv3" or t == "__canary_lv3_b" then count += 1 end
end
if count ~= 2 then die() end
f2:Destroy() f2c:Destroy()

local root = Instance.new("Folder") root.Name = "Root"
local child = Instance.new("Folder") child.Name = "Child" child.Parent = root
local grandchild = Instance.new("Folder") grandchild.Name = "GC" grandchild.Parent = child
local fullBefore = grandchild:GetFullName()
child.Name = "MUTATED"
local fullAfter = grandchild:GetFullName()
if fullBefore == fullAfter then die() end
if not fullAfter:find("MUTATED") then die() end
root:Destroy()

local a = Instance.new("Folder")
local b = Instance.new("Folder") b.Parent = a
local c4 = Instance.new("Folder") c4.Parent = b
if not a:IsAncestorOf(c4) then die() end
if not c4:IsDescendantOf(a) then die() end
c4.Parent = nil
if a:IsAncestorOf(c4) then die() end
if c4:IsDescendantOf(a) then die() end
a:Destroy() c4:Destroy()

local f5 = Instance.new("Folder")
local p5 = Instance.new("Folder")
local fireCount = 0
f5.AncestryChanged:Connect(function() fireCount += 1 end)
f5.Parent = p5
task.defer(function()
    if fireCount ~= 1 then die() end
    f5:Destroy() p5:Destroy()
end)

local f6 = Instance.new("Folder")
f6:SetAttribute("__secret", 42)
f6.Archivable = false
local f6c = f6:Clone()
if f6c ~= nil then die() end
f6:Destroy()

local root7 = Instance.new("Folder")
for i = 1, 5 do
    local ch = Instance.new("Folder") ch.Parent = root7
    for j = 1, 3 do
        local gch = Instance.new("Folder") gch.Parent = ch
    end
end
local desc = root7:GetDescendants()
if #desc ~= 20 then die() end
local cloned7 = root7:Clone()
if #cloned7:GetDescendants() ~= #desc then die() end
root7:Destroy() cloned7:Destroy()

local f8 = Instance.new("Folder")
f8:SetAttribute("__watch", 0)
local attrFired = false
f8:GetAttributeChangedSignal("__watch"):Connect(function() attrFired = true end)
local f8c = f8:Clone()
task.defer(function()
    if attrFired then die() end
    f8:SetAttribute("__watch", 1)
    task.defer(function()
        if not attrFired then die() end
        f8:Destroy() f8c:Destroy()
    end)
end)

local f9 = Instance.new("Folder")
local added, removed = 0, 0
f9.ChildAdded:Connect(function() added += 1 end)
f9.ChildRemoved:Connect(function() removed += 1 end)
local kids = {}
for i = 1, 4 do
    local k = Instance.new("Folder") k.Parent = f9
    table.insert(kids, k)
end
for _, k in ipairs(kids) do k.Parent = nil end
task.defer(function()
    if added ~= 4 then die() end
    if removed ~= 4 then die() end
    f9:Destroy()
    for _, k in ipairs(kids) do k:Destroy() end
end)

local f10 = Instance.new("Folder")
f10.Name = "original"
local f10c = f10:Clone()
local cloneFired = false
f10c:GetPropertyChangedSignal("Name"):Connect(function() cloneFired = true end)
f10.Name = "mutated_original"
task.defer(function()
    if cloneFired then die() end
    if f10c.Name ~= "original" then die() end
    f10:Destroy() f10c:Destroy()
    task.defer(function()
        if #findings == 0 then
            return true
        else
            for _, msg in ipairs(findings) do warn(msg) end
            die()
        end
    end)
end)
end

-- probe L3:2
local function _p_3_2()
local findings = {}
local function die() table.insert(findings, "probe validation failed") end

local f1 = Instance.new("Folder")
f1.Name = "test"
if not f1:IsPropertyModified("Name") then die() end
f1:ResetPropertyToDefault("Name")
if f1:IsPropertyModified("Name") then die() end
if f1.Name ~= "Folder" then die() end
f1:Destroy()

local be = Instance.new("BindableEvent")
local fired = false
local firedVal = nil
be.Event:Connect(function(v) fired = true firedVal = v end)
be:Fire("__sentinel_777")
task.defer(function()
    if not fired then die() end
    if firedVal ~= "__sentinel_777" then die() end
    be:Destroy()
end)

local id1 = Instance.new("Folder"):GetDebugId(10)
local id2 = Instance.new("Folder"):GetDebugId(10)
local id3 = Instance.new("Folder"):GetDebugId(10)
if id1 == id2 or id2 == id3 or id1 == id3 then die() end

local ik = Instance.new("IKControl")
local p0 = Instance.new("Part")
local p1 = Instance.new("Part")
ik.ChainRoot = p0
ik.EndEffector = p1
ik.SmoothTime = 3.33
ik.Weight = 0.77
local ikc = ik:Clone()
if ikc.ChainRoot ~= p0 then die() end
if ikc.EndEffector ~= p1 then die() end
ik.ChainRoot = p1
if ikc.ChainRoot == ik.ChainRoot then die() end
if math.abs(ikc.SmoothTime - 3.33) > 0.0001 then die() end
ik:Destroy() ikc:Destroy() p0:Destroy() p1:Destroy()

local pose = Instance.new("Pose")
pose.CFrame = CFrame.new(1.11, 2.22, 3.33)
local sub1 = Instance.new("Pose") sub1.CFrame = CFrame.new(4, 5, 6)
local sub2 = Instance.new("Pose") sub2.CFrame = CFrame.new(7, 8, 9)
if pose.AddSubPose then
    pose:AddSubPose(sub1)
    pose:AddSubPose(sub2)
    local subs = pose:GetSubPoses()
    if #subs ~= 2 then die() end
    local posec = pose:Clone()
    local subsc = posec:GetSubPoses()
    if #subsc ~= 2 then die() end
    posec.CFrame = CFrame.new(0,0,0)
    if posec.CFrame == pose.CFrame then die() end
    posec:Destroy()
else
    die()
end
pose:Destroy() sub1:Destroy() sub2:Destroy()

local f6 = Instance.new("Folder")
f6:SetAttribute("__a", 11)
f6:SetAttribute("__b", 22)
f6:SetAttribute("__c", 33)
local attrs = f6:GetAttributes()
if attrs["__a"] ~= 11 then die() end
if attrs["__b"] ~= 22 then die() end
if attrs["__c"] ~= 33 then die() end
local count = 0
for _ in pairs(attrs) do count += 1 end
if count ~= 3 then die() end
f6:Destroy()

local plink = Instance.new("PathfindingLink")
local pa = Instance.new("Attachment")
local pb = Instance.new("Attachment")
plink.Attachment0 = pa
plink.Attachment1 = pb
plink.Label = "__pf_canary"
plink.IsBidirectional = true
local plinkc = plink:Clone()
if plinkc.Label ~= "__pf_canary" then die() end
if plinkc.IsBidirectional ~= true then die() end
plink.Label = ""
if plinkc.Label == plink.Label then die() end
if plinkc.Attachment0 ~= pa then die() end
plink:Destroy() plinkc:Destroy() pa:Destroy() pb:Destroy()

local bf = Instance.new("BindableFunction")
bf.OnInvoke = function(v) return v * 2 end
local result = bf:Invoke(21)
if result ~= 42 then die() end
bf.OnInvoke = function(v) return v + 1 end
local result2 = bf:Invoke(21)
if result2 ~= 22 then die() end
if result == result2 then die() end
bf:Destroy()

local pfm = Instance.new("PathfindingModifier")
pfm.Label = "__pfm_canary"
pfm.PassThrough = true
local pfmc = pfm:Clone()
pfm.Label = "changed"
pfm.PassThrough = false
if pfmc.Label == pfm.Label then die() end
if pfmc.PassThrough == pfm.PassThrough then die() end
if pfmc.Label ~= "__pfm_canary" then die() end
pfm:Destroy() pfmc:Destroy()

local destroying = false
local f10 = Instance.new("Folder")
f10.Destroying:Connect(function() destroying = true end)
local f10c = f10:Clone()
local destroyingClone = false
f10c.Destroying:Connect(function() destroyingClone = true end)
f10:Destroy()
task.defer(function()
    if not destroying then die() end
    if destroyingClone then die() end
    f10c:Destroy()
    task.defer(function()
        if not destroyingClone then die() end
        if #findings == 0 then
            return true
        else
            for _, msg in ipairs(findings) do warn(msg) end
            die()
        end
    end)
end)
end

-- probe L3:3
local function _p_3_3()
local findings = {}
local function die() table.insert(findings, "probe validation failed") end

local ac = Instance.new("AudioChorus")
ac.Depth = 0.66
ac.Mix = 0.44
ac.Rate = 3.33
local acc = ac:Clone()
if math.abs(acc.Depth - ac.Depth) > 0.0001 then die() end
ac.Depth = 0
if acc.Depth == ac.Depth then die() end
if math.abs(acc.Rate - 3.33) > 0.0001 then die() end
ac:Destroy() acc:Destroy()

local mc = Instance.new("MarkerCurve")
mc:InsertMarkerAtTime(0.5, "marker_a")
mc:InsertMarkerAtTime(1.5, "marker_b")
if mc.Length ~= 2 then die() end
local mcc = mc:Clone()
if mcc.Length ~= 2 then die() end
local markers = mcc:GetMarkers()
if #markers ~= 2 then die() end
mc:RemoveMarkerAtIndex(1)
if mcc.Length == mc.Length then die() end
mc:Destroy() mcc:Destroy()

local kf = Instance.new("Keyframe")
kf.Time = 2.5
local km = Instance.new("KeyframeMarker")
km.Name = "__km_canary"
km.Value = "__marker_val"
kf:AddMarker(km)
local kfc = kf:Clone()
if math.abs(kfc.Time - 2.5) > 0.0001 then die() end
local kfmarkers = kfc:GetMarkers()
if #kfmarkers ~= 1 then die() end
if kfmarkers[1].Value ~= "__marker_val" then die() end
kf.Time = 99
if kfc.Time == kf.Time then die() end
kf:Destroy() kfc:Destroy()

local np = Instance.new("NumberPose")
np.Value = 7.77
np.Weight = 0.55
local npc = np:Clone()
if math.abs(npc.Value - 7.77) > 0.0001 then die() end
np.Value = 0
if npc.Value == np.Value then die() end
if math.abs(npc.Weight - 0.55) > 0.0001 then die() end
np:Destroy() npc:Destroy()

local ks = Instance.new("KeyframeSequence")
local kf1 = Instance.new("Keyframe") kf1.Time = 0
local kf2 = Instance.new("Keyframe") kf2.Time = 1
local kf3 = Instance.new("Keyframe") kf3.Time = 2
ks:AddKeyframe(kf1) ks:AddKeyframe(kf2) ks:AddKeyframe(kf3)
local kfs = ks:GetKeyframes()
if #kfs ~= 3 then die() end
local ksc = ks:Clone()
local kfsc = ksc:GetKeyframes()
if #kfsc ~= 3 then die() end
ks:RemoveKeyframe(kf1)
if #ks:GetKeyframes() == #ksc:GetKeyframes() then die() end
ks:Destroy() ksc:Destroy()

local rc = Instance.new("RotationCurve")
if rc.Length ~= 0 then die() end
local rcc = rc:Clone()
if rcc.Length ~= 0 then die() end
rc:Destroy() rcc:Destroy()

local f7a = Instance.new("Folder")
local f7b = Instance.new("Folder")
f7a:SetAttribute("__shared", 55)
f7b:SetAttribute("__shared", 55)
local a7 = f7a:GetAttributes()
local b7 = f7b:GetAttributes()
if a7["__shared"] ~= b7["__shared"] then die() end
f7a:SetAttribute("__shared", 99)
local a7new = f7a:GetAttributes()
if a7new["__shared"] == b7["__shared"] then die() end
f7a:Destroy() f7b:Destroy()

local be = Instance.new("BindableEvent")
local log = {}
be.Event:Connect(function(v) table.insert(log, v) end)
be:Fire("x") be:Fire("y") be:Fire("z")
task.defer(function()
    if #log ~= 3 then die() end
    if log[1] ~= "x" or log[2] ~= "y" or log[3] ~= "z" then die() end
    be:Destroy()
end)

local f9 = Instance.new("Folder")
f9.Name = "orig"
local id = f9:GetDebugId(4)
f9.Name = "changed"
local id2 = f9:GetDebugId(4)
if id ~= id2 then die() end
local f9b = Instance.new("Folder")
local idb = f9b:GetDebugId(4)
if id == idb then die() end
f9:Destroy() f9b:Destroy()

local f10 = Instance.new("Folder")
f10.Name = "sentinel"
f10:SetAttribute("__tag", 1337)
f10.Archivable = false
local f10c = f10:Clone()
if f10c ~= nil then die() end
f10.Archivable = true
local f10c2 = f10:Clone()
if f10c2 == nil then die() end
if f10c2:GetAttribute("__tag") ~= 1337 then die() end
if f10c2.Name ~= "sentinel" then die() end
f10:Destroy() f10c2:Destroy()

task.defer(function() task.defer(function()
    if #findings == 0 then
        return true
    else
        for _, msg in ipairs(findings) do warn(msg) end
        die()
    end
end) end)
end


local L1 = {_p_1_1, _p_1_2, _p_1_3, _p_1_4, _p_1_5, _p_1_6, _p_1_7, _p_1_8, _p_1_9, _p_1_10, _p_1_11, _p_1_12, _p_1_13, _p_1_14, _p_1_15, _p_1_16, _p_1_17, _p_1_18, _p_1_19, _p_1_20, _p_1_21}
local L2 = {_p_2_1, _p_2_2, _p_2_3, _p_2_4, _p_2_5, _p_2_6, _p_2_7, _p_2_8, _p_2_9}
local L3 = {_p_3_1, _p_3_2, _p_3_3}

local function run_list(list)
    local copy = {}
    for i = 1, #list do copy[i] = list[i] end
    shuffle(copy)
    for i = 1, #copy do
        local ok = pcall(copy[i])
        if not ok then die() end
    end
end

local AntiDump = {}
function AntiDump.run(level)
    level = level or 2
    if level >= 1 then run_list(L1) end
    if level >= 2 then run_list(L2) end
    if level >= 3 then run_list(L3) end
    return true
end
return AntiDump
