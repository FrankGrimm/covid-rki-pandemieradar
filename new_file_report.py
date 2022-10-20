from glob import glob
import os

DATA_DIR="./data"

prev_files = None

def dir_files(directory):
    res = set()
    for fname in glob(os.path.join(report_dir, "*.*")):
        res.add(os.path.basename(fname))
    return res

for report_dir in sorted(glob(os.path.join(DATA_DIR, "*"))):
    report_date = os.path.basename(report_dir)

    if prev_files is None:
        prev_files = dir_files(report_dir)
        continue
    cur_files = dir_files(report_dir)
    for fname in cur_files:
        if fname not in prev_files:
            print("[new]", report_date, fname)
    for fname in prev_files:
        if fname not in cur_files:
            print("[missing]", report_date, fname)
    prev_files = cur_files
