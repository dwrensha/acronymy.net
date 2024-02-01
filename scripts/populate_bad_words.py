import argparse
import json
import os
import random
import sys

parser = argparse.ArgumentParser(description="populate the bad_words table from a text file")
parser.add_argument("--file", type=str, required=True)
args = parser.parse_args()

bad_words = []


result = "insert into bad_words (word) values "


f = open(args.file, 'r')

is_first = True
for line in f:
    word = line.strip()
    if not is_first:
        result += ","
    result += "('{}')".format(word)

    is_first = False

result += ";"
print(result)
