"""
Builds public/models/human-male.bin from the MakeHuman CC0 base mesh.

Sources (both CC0, released by the MakeHuman project in 2020):
  makehuman/data/3dobjs/base.obj
  makehuman/data/targets/macrodetails/{african,asian,caucasian}-male-young.target
Usage: python3 scripts/build-human.py <dir with base.obj and the .target files>

Steps: apply the average young-male shape → keep the body (+ eyeballs) →
lower the arms from the A-pose to a relaxed stance → scale/translate into the
site's world units (shoulder joints at y = 1.96, x = ±0.74, facing +z) →
write a compact binary: 'HUM1' | u32 nVerts | u32 nIdx | f32 xyz… | u16 idx…
"""
import math, struct, sys, os

src = sys.argv[1] if len(sys.argv) > 1 else '.'
V, groups, faces = [], {}, []
grp = None
for line in open(os.path.join(src, 'base.obj')):
    if line.startswith('v '):
        V.append(list(map(float, line.split()[1:4])))
    elif line.startswith('g '):
        grp = line.split()[1]
    elif line.startswith('f '):
        f = [int(t.split('/')[0]) - 1 for t in line.split()[1:]]
        groups.setdefault(grp, set()).update(f)
        if grp in ('body', 'helper-l-eye', 'helper-r-eye'):
            faces.append(f)

# 1) average young-male shape (MakeHuman default ethnic mix: 1/3 each)
for eth in ('african', 'asian', 'caucasian'):
    for line in open(os.path.join(src, f'{eth}-male-young.target')):
        if not line.strip() or line.startswith('#'):
            continue
        i, dx, dy, dz = line.split()
        v = V[int(i)]
        v[0] += float(dx) / 3; v[1] += float(dy) / 3; v[2] += float(dz) / 3

def centre(g):
    p = [V[i] for i in groups[g]]
    return [sum(q[k] for q in p) / len(p) for k in range(3)]

sh = {s: centre(f'joint-{n}-shoulder') for s, n in ((1, 'l'), (-1, 'r'))}
el = {s: centre(f'joint-{n}-elbow') for s, n in ((1, 'l'), (-1, 'r'))}

used = sorted({i for f in faces for i in f})
smooth = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1, max(0, (x - a) / (b - a))))

# 2) lower the arms: rotate about the shoulder joint in the frontal plane.
#    Arm vertices are picked by distance to the arm's bone chain (shoulder → elbow → hand → fingertips),
#    so the chest wall under the armpit is never dragged along.
hand = {s: centre(f'joint-{n}-hand') for s, n in ((1, 'l'), (-1, 'r'))}

def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / L2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy)), t

TARGET_DEG = 11  # final angle of the upper arm from vertical
FA = {}
for s in (1, -1):
    sx, sy = sh[s][0], sh[s][1]
    ex, ey = el[s][0], el[s][1]
    hx, hy = hand[s][0], hand[s][1]
    fx, fy = hx + (hx - ex) * 0.75, hy + (hy - ey) * 0.75  # past the fingertips
    ax, ay = ex - sx, ey - sy
    L = math.hypot(ax, ay); ux, uy = ax / L, ay / L
    cur = math.degrees(math.atan2(abs(ax), -ay))
    ang = math.radians(cur - TARGET_DEG) * (-s)  # clockwise for the left arm
    for i in used:
        x, y, z = V[i]
        if x * s < 0.3:
            continue
        d1, t1 = seg_dist(x, y, sx, sy, ex, ey)
        d2, _ = seg_dist(x, y, ex, ey, hx, hy)
        d3, _ = seg_dist(x, y, hx, hy, fx, fy)
        d = min(d1, d2, d3)
        if d > 0.95:
            continue
        along = (x - sx) * ux + (y - sy) * uy
        # full rotation along the arm; blend in over the shoulder, and fade out for
        # vertices that are near the shoulder but far from the arm axis (armpit / chest wall)
        w = smooth(-0.35, 0.75, along)
        near_sh = 1 - smooth(0.6, 1.4, along)
        w *= 1 - near_sh * smooth(0.5, 0.85, d1)
        w *= 1 - smooth(0.75, 0.95, d)
        if w <= 0:
            continue
        a = ang * w
        c, si = math.cos(a), math.sin(a)
        dx, dy = x - sx, y - sy
        V[i][0] = sx + dx * c - dy * si
        V[i][1] = sy + dx * si + dy * c
        FA[i] = (s, along)  # remember for the forearm pass

    # forearm/hand: the rest pose has them angled forwards; swing them down (sagittal plane)
    rot = lambda px, py: (sx + (px - sx) * math.cos(ang) - (py - sy) * math.sin(ang), sy + (px - sx) * math.sin(ang) + (py - sy) * math.cos(ang))
    ex2, ey2 = rot(ex, ey)
    hx2, hy2 = rot(hx, hy)
    ez, hz = el[s][2], hand[s][2]
    fore = math.hypot(hx2 - ex2, hy2 - ey2)
    phi = math.atan2(hz - ez, fore) - math.radians(8)  # leave the hand a touch forward
    for i, (side, along) in list(FA.items()):
        if side != s:
            continue
        w = smooth(L - 0.35, L + 0.45, along)  # 0 above the elbow → 1 along the forearm
        if w <= 0:
            continue
        x, y, z = V[i]
        dy, dz = y - ey2, z - ez
        a = phi * w
        c, si = math.cos(a), math.sin(a)
        V[i][1] = ey2 + dy * c - dz * si
        V[i][2] = ez + dy * si + dz * c

# 3) into world units
S = 0.74 / sh[1][0]
oy = 1.96 - sh[1][1] * S
chest = [V[i] for i in used if abs(V[i][1] - (sh[1][1] - 0.9)) < 0.08 and abs(V[i][0]) < 0.3]
zc = (max(p[2] for p in chest) + min(p[2] for p in chest)) / 2
remap = {old: new for new, old in enumerate(used)}
pos = []
for i in used:
    x, y, z = V[i]
    pos += [x * S, y * S + oy, (z - zc) * S]
idx = []
for f in faces:
    a, b, c, d = (remap[i] for i in f) if len(f) == 4 else (*[remap[i] for i in f], None)
    idx += [a, b, c] + ([a, c, d] if d is not None else [])

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'human-male.bin')
with open(out, 'wb') as fh:
    fh.write(b'HUM1' + struct.pack('<II', len(used), len(idx)))
    fh.write(struct.pack(f'<{len(pos)}f', *pos))
    fh.write(struct.pack(f'<{len(idx)}H', *idx))
ys = pos[1::3]; xs = pos[0::3]
print(f'{len(used)} verts, {len(idx)//3} tris, {os.path.getsize(out)//1024} KB')
print(f'y {min(ys):.2f}..{max(ys):.2f}  x {min(xs):.2f}..{max(xs):.2f}  scale {S:.4f}')
for name in ('joint-head-2', 'joint-jaw', 'joint-neck', 'joint-l-clavicle', 'joint-spine-1', 'joint-spine-2', 'joint-l-eye'):
    c = centre(name); print(name, [round(c[0] * S, 3), round(c[1] * S + oy, 3), round((c[2] - zc) * S, 3)])
# nose tip = most forward body vertex in the face
face = [V[i] for i in groups['body'] if V[i][1] > sh[1][1] + 1.0]
nt = max(face, key=lambda p: p[2])
print('nose tip', [round(nt[0] * S, 3), round(nt[1] * S + oy, 3), round((nt[2] - zc) * S, 3)])
