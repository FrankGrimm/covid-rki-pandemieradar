import os
from glob import glob
import hashlib
import sys

dry_run = "--dryrun" in sys.argv

PATTERNS = ["./raw/*.json"]

for pattern in PATTERNS:
    files = list(sorted(glob(pattern)))
    hashes = []
    for filename in files:
        with open(filename, "rb") as infile:
            content = infile.read()
            filehash = hashlib.md5(content).hexdigest()
            hashes.append(filehash)
    is_duplicate = [False] * len(files)

    seen_hashes = set()
    for idx in range(len(files)):
        filehash = hashes[idx]
        filename = files[idx]

        if filehash in seen_hashes:
            is_duplicate[idx] = True

        print(os.path.dirname(filename), filehash, os.path.basename(filename), "[duplicate]" if is_duplicate[idx] else "")
        seen_hashes.add(filehash)

    print(f"deleting {sum([1 for x in is_duplicate if x])} duplicates of {len(files)} total files")
    for idx in range(len(files)):
        filename = files[idx]
        if not is_duplicate[idx]:
            continue
        if dry_run:
            print("delete (dry-run)", os.path.dirname(filename), os.path.basename(filename))
        else:
            print("delete", os.path.dirname(filename), os.path.basename(filename))
            os.unlink(filename)


