import argparse
import subprocess

parser = argparse.ArgumentParser(description="remove a word from the wordlist")
parser.add_argument("--word", type=str, required=True, help="word to remove")
parser.add_argument("--preview", type=bool, default=False)
args = parser.parse_args()

preview_arg = "--preview=false"
if args.preview:
    preview_arg = "--preview=true"


completed_process = subprocess.run(
      ["wrangler",
       "kv:key",
       "get",
       "--binding=META",
       preview_arg,
       "word-list"],
      stdout=subprocess.PIPE)

if completed_process.returncode != 0:
    print("download failed")
    exit(1)

initial = args.word[0]

all_words = []
words_with_same_initial = []

found_it = False

for word in completed_process.stdout.decode("utf-8").split("\n"):
    if len(word) == 0: # can happen on last line
        continue
    if word == args.word:
        found_it = True
        continue
    all_words.append(word)
    if word[0] == args.word[0]:
        words_with_same_initial.append(word)

if not found_it:
    raise Exception("did not find word")

NEW_WORDLIST_FILE = "/tmp/new-wordlist.txt"
with open(NEW_WORDLIST_FILE, "w") as f:
    f.write("\n".join(all_words) + "\n")

completed_process = subprocess.run(
    ["wrangler",
     "kv:key",
     "put",
     "--binding=META",
     preview_arg,
     "word-list",
     "--path={}".format(NEW_WORDLIST_FILE)],
    check=True)

v1 = "\n".join(words_with_same_initial)
filename = "/tmp/wordlist-{}.txt".format(initial)
with open(filename, 'w') as f:
    f.write(v1)
print("word-list-" + initial)
subprocess.run(
    ["wrangler",
     "kv:key",
     "put",
     "--binding=META",
     preview_arg,
     "word-list-" + initial,
     "--path={}".format(filename)],
    check=True)

