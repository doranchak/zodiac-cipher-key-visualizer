import json
from collections import Counter, defaultdict

BASE = "/Users/doranchak/projects/github/zodiac-cipher-key-visualizer"


def load_lines(name):
    with open(f"{BASE}/{name}") as f:
        return [l.rstrip("\n") for l in f if l.strip("\n")]


def flat(lines):
    return "".join(lines)


z408_lines = load_lines("z408.txt")
z408pt_lines = load_lines("z408-pt.txt")
z340_lines = load_lines("z340.txt")
z340pt_lines = load_lines("z340-pt.txt")
z340u_lines = load_lines("z340-untransposed.txt")
z340upt_lines = load_lines("z340-untransposed-pt.txt")

z408_flat = flat(z408_lines)
z408pt_flat = flat(z408pt_lines)
z340_flat = flat(z340_lines)
z340pt_flat = flat(z340pt_lines)
z340u_flat = flat(z340u_lines)
z340upt_flat = flat(z340upt_lines)

assert len(z408_flat) == 408 == len(z408pt_flat)
assert len(z340_flat) == 340 == len(z340pt_flat) == len(z340u_flat) == len(z340upt_flat)

# ---- word-break lengths for alternating-word plaintext shading ----
Z408_WORDS = [1,4,7,6,7,2,2,2,4,3,2,2,4,3,4,7,4,4,2,3,7,7,3,2,3,4,9,6,2,3,2,4,9,5,2,3,4,9,9,2,2,4,6,4,7,4,5,3,4,1,4,3,4,4,2,2,6,4,1,3,1,4,2,6,2,8,3,3,3,1,4,6,4,6,2,6,1,4,3,4,3,2,4,7,3,4,3,2,4,4,2,4,2,10,2,6,3,2,9,18]
Z340U_WORDS = [1,4,3,3,6,4,2,3,2,6,2,5,2,4,5,2,2,3,2,4,5,8,1,5,5,2,1,2,3,6,2,3,3,7,7,2,4,4,2,2,8,3,3,6,7,4,4,6,6,2,4,3,2,5,8,4,3,7,4,4,5,8,2,4,3,6,2,5,1,2,3,6,7,1,4,4,2,3,4,2,4,4,2,2,4,3,2,8,5]
assert sum(Z408_WORDS) == 408
assert sum(Z340U_WORDS) == 340


def word_parity(word_lengths, total):
    out = [0] * total
    idx = 0
    parity = 0
    for w in word_lengths:
        for i in range(w):
            out[idx + i] = parity
        idx += w
        parity ^= 1
    assert idx == total
    return out


z408_parity = word_parity(Z408_WORDS, 408)
z340u_parity = word_parity(Z340U_WORDS, 340)


def make_grid(cipher_flat, pt_flat, cols, rows, parity=None):
    grid = []
    idx = 0
    for r in range(rows):
        row = []
        for c in range(cols):
            cell = {"sym": cipher_flat[idx], "letter": pt_flat[idx]}
            if parity is not None:
                cell["w"] = parity[idx]
            row.append(cell)
            idx += 1
        grid.append(row)
    assert idx == len(cipher_flat)
    return grid


cipher408 = {"cols": 17, "rows": 24, "grid": make_grid(z408_flat, z408pt_flat, 17, 24, z408_parity)}
cipher340 = {"cols": 17, "rows": 20, "grid": make_grid(z340_flat, z340pt_flat, 17, 20, None)}
cipher340u = {"cols": 17, "rows": 20, "grid": make_grid(z340u_flat, z340upt_flat, 17, 20, z340u_parity)}

# ---- per-letter homophone groups + occurrence counts ----
counts408 = Counter(z408_flat)
counts340 = Counter(z340_flat)  # untransposed uses the same multiset, just reordered

letter_syms_408 = defaultdict(set)
for sym, letter in zip(z408_flat, z408pt_flat):
    letter_syms_408[letter].add(sym)

letter_syms_340 = defaultdict(set)
for sym, letter in zip(z340_flat, z340pt_flat):
    letter_syms_340[letter].add(sym)

letters408 = {
    L: sorted(syms, key=lambda s: (-counts408[s], s))
    for L, syms in letter_syms_408.items()
}
letters340 = {
    L: sorted(syms, key=lambda s: (-counts340[s], s))
    for L, syms in letter_syms_340.items()
}

lettersOrder = sorted(set(letters408) | set(letters340))

# ---- symbol -> letter maps (a symbol maps to one letter within a given cipher) ----
sym_letter_408 = {}
for L, syms in letter_syms_408.items():
    for s in syms:
        sym_letter_408[s] = L
sym_letter_340 = {}
for L, syms in letter_syms_340.items():
    for s in syms:
        sym_letter_340[s] = L

all_syms = set(sym_letter_408) | set(sym_letter_340)
print(f"distinct symbols: {len(all_syms)} (z408 {len(sym_letter_408)}, z340 {len(sym_letter_340)})")

# ---- sort order for table 2: alphabetical (case pairs adjacent), then digits, then shapes ----
lower_used = sorted(c for c in all_syms if c.islower())
order = []
for L in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    if L in all_syms:
        order.append(L)
    if L.lower() in all_syms:
        order.append(L.lower())
for d in "123456789":
    if d in all_syms:
        order.append(d)
SHAPE_ORDER = list("!:;+#%*_@()<>^=/\\-|.&")
for s in SHAPE_ORDER:
    if s in all_syms:
        order.append(s)

missing = all_syms - set(order)
if missing:
    raise SystemExit(f"Unplaced symbols: {missing}")
assert len(order) == len(all_syms)

symbols = []
for ch in order:
    l408 = sym_letter_408.get(ch)
    l340 = sym_letter_340.get(ch)
    symbols.append({
        "sym": ch,
        "letter408": l408,
        "letter340": l340,
        "count408": counts408.get(ch, 0),
        "count340": counts340.get(ch, 0),
    })

matches = [s["sym"] for s in symbols if s["letter408"] and s["letter340"] and s["letter408"] == s["letter340"]]
print(f"matches: {len(matches)} -> {matches}")

data = {
    "lettersOrder": lettersOrder,
    "letters408": letters408,
    "letters340": letters340,
    "counts408": counts408,
    "counts340": counts340,
    "symbols": symbols,
    "matches": matches,
    "cipher408": cipher408,
    "cipher340": cipher340,
    "cipher340u": cipher340u,
}

with open(f"{BASE}/assets/data.js", "w") as f:
    f.write("const DATA = ")
    json.dump(data, f)
    f.write(";\n")

print("wrote assets/data.js")
