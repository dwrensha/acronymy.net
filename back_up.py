import argparse
import json
import os
import random
import subprocess
import sys

completed_process = subprocess.run(["wrangler", "kv:key", "list",
                                    "--env=prod",
                                    "--binding", "WORDS_LOG"],
                                   stdout=subprocess.PIPE,
                                   check=True)

listed = json.loads(completed_process.stdout.decode("utf-8"))

for item in listed:
    for ii in range(5):
        try:
            name = item['name']
            item_process = subprocess.run(["wrangler", "kv:key", "get", name,
                                           "--env=prod",
                                           "--binding", "WORDS_LOG"],
                                          stdout=subprocess.PIPE,
                                          check=True)
            value = item_process.stdout.decode("utf-8")
            print("{}: {}".format(name, value))
            item['value'] = value
            break
        except:
            print("error: ", sys.exc_info()[0])


outfile = open("backup.json", "w")
outfile.write(json.dumps(listed))




