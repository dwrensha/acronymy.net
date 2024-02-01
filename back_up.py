import argparse
import json
import os
import random
import subprocess
import sys

parser = argparse.ArgumentParser(description="create a JSON backup")
parser.add_argument("--env", type=str, required=True)
parser.add_argument("--start_time", type=int, required=False, default=0)
args = parser.parse_args()

env_arg = "--env={}".format(args.env)
start_time = args.start_time

completed_process = subprocess.run(["wrangler", "kv:key", "list",
                                    env_arg,
                                    "--binding", "WORDS_LOG"],
                                   stdout=subprocess.PIPE,
                                   check=True)

listed = json.loads(completed_process.stdout.decode("utf-8"))
keep = []

for item in listed:
    for ii in range(5):
        try:
            name = item['name']
            timestamp = name.split(":")[1]
            if int(timestamp) < start_time:
                break
            item_process = subprocess.run(
                ["wrangler", "kv:key", "get", name,
                 env_arg,
                 "--binding", "WORDS_LOG"],
                stdout=subprocess.PIPE,
                check=True)
            value = item_process.stdout.decode("utf-8")
            print("{}: {}".format(name, value))
            item['value'] = value
            keep.append(item)
            break
        except:
            print("error: ", sys.exc_info()[0])

outfile = open("backup.json", "w")
outfile.write(json.dumps(keep))




