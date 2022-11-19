import argparse
import json

f = open('backup-2023-05-18.json', 'r')
j = json.load(f)

for w in j:
    if "metadata" in w:
        m = w["metadata"]
        if "ip" in m:
            del m["ip"]

outfile = open("/tmp/public-backup-2023-05-18.json", "w")
json.dump(j, outfile)
