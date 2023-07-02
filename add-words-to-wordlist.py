import argparse
import subprocess

parser = argparse.ArgumentParser(description="add some words to the wordlist")
parser.add_argument("--new_words_file", type=str, required=True, help="file containing new words")
parser.add_argument("--env", type=str, required=True)
args = parser.parse_args()

env_arg = "--env={}".format(args.env)

words_by_initial = {}
all_words = set()

completed_process = subprocess.run(
      ["wrangler",
       "kv:key",
       "get",
       "--binding=META",
       env_arg,
       "word-list"],
      stdout=subprocess.PIPE)

if completed_process.returncode != 0:
    print("download failed")
    exit(1)

for word in completed_process.stdout.decode("utf-8").split("\n"):
    if len(word) == 0: # can happen on last line
        continue
    all_words.add(word)
    initial = word[0]
    if not initial in words_by_initial:
        words_by_initial[initial] = []
    words_by_initial[initial].append(word)


new_words = set()
words_file = open(args.new_words_file, "r")

new_initials = set()

for line in words_file.readlines():
    word = line.strip()
    if len(word) == 0:
        continue
    if word in all_words:
        continue

    new_words.add(word)
    all_words.add(word)
    initial = word[0]
    new_initials.add(initial)
    if not initial in words_by_initial:
        words_by_initial[initial] = []
    words_by_initial[initial].append(word)

# just double check...
total_wbi = 0;
for k in words_by_initial:
    total_wbi += len(words_by_initial[k])

assert(total_wbi == len(all_words))

new_words_file = open("/tmp/new-words.txt", "w")
for new_word in sorted(new_words):
    new_words_file.write(new_word + "\n")


open("/tmp/newly-added-words.txt", "w")
for new_word in sorted(new_words):
    new_words_file.write(new_word + "\n")

print("{} newly added words".format(len(new_words)))

if len(new_words) == 0:
    print("no work to do")
    exit(0)

NEW_WORDLIST_FILE = "/tmp/new-wordlist.txt"
with open(NEW_WORDLIST_FILE, "w") as f:
    for word in sorted(all_words):
        f.write(word + "\n")

completed_process = subprocess.run(
    ["wrangler",
     "kv:key",
     "put",
     "--binding=META",
     "--preview=false",
     env_arg,
     "word-list",
     "--path={}".format(NEW_WORDLIST_FILE)],
    check=True)

for (k,v) in words_by_initial.items():
    if k not in new_initials:
        continue
    v1 = "\n".join(v)
    filename = "/tmp/wordlist-{}.txt".format(k)
    with open(filename, 'w') as f:
        f.write(v1)
    print("word-list-" + k)
    subprocess.run(
        ["wrangler",
         "kv:key",
         "put",
         "--binding=META",
         "--preview=false",
         env_arg,
         "word-list-" + k,
         "--path={}".format(filename)],
        check=True)


