import argparse
import json
import os
import random
import sys

parser = argparse.ArgumentParser(description="populate the words table from a text file")
parser.add_argument("--file", type=str, required=True)
args = parser.parse_args()

bad_words = []


result = "insert into words (word) values "


f = open(args.file, 'r')

count = 0
is_first = True
for line in f:
    word = line.strip()
    if not is_first:
        result += ","
    result += "('{}')".format(word)

    count += 1
    if count % 800 == 0:
        is_first = True
        result += ";\ninsert into words (word) values "
    else:
        is_first = False

result += ";"
print(result)
