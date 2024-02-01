import argparse
import json
import os
import random
import sys

parser = argparse.ArgumentParser(description="populate the defs_log table from a json backup")
parser.add_argument("--env", type=str, required=True)
parser.add_argument("--file", type=str, required=True)
args = parser.parse_args()

env_arg = "--env={}".format(args.env)

with open(args.file, 'r') as f:
    data = json.load(f)

result = "insert into defs_log (word, def, author, timestamp, ip) values "

count = 0

is_first = True
for item in data:
    if not is_first:
        result += ","
    word = item['name'].split(":")[0]
    defn = item['value']
    md = item.get('metadata', {})

    if "user" in md:
        author = "'{}'".format(md["user"])
    else:
        author = "NULL"

    if "time" in md:
        timestamp = md["time"]
    else:
        timestamp = "0"

    if "ip" in md:
        ip = "'{}'".format(md["ip"])
    else:
        ip = "NULL"
    result += "('{}', '{}', {}, {}, {})".format(word, defn, author, timestamp, ip)

    count += 1
    if count % 800 == 0:
        is_first = True
        result += ";\ninsert into defs_log (word, def, author, timestamp, ip) values "
    else:
        is_first = False

result += ";"
print(result)
