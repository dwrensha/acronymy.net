import subprocess

words_file = open("/home/dwrensha/Desktop/acronymy-words.txt", "r")

words_by_initial = {}

for line in words_file.readlines():
    word = line.strip()
    if len(word) == 0:
        continue
    initial = word[0]
    if not initial in words_by_initial:
        words_by_initial[initial] = []
    words_by_initial[initial].append(word)

for (k,v) in words_by_initial.items():
    v1 = "\n".join(v)
    filename = "/tmp/wordlist-{}.txt".format(k)
    with open(filename, 'w') as f:
        f.write(v1)
    print("word-list-" + k)
    subprocess.run(
        ["/home/dwrensha/.nvm/versions/node/v16.13.0/bin/wrangler",
         "kv:key",
         "put",
         "--binding=META",
         "--preview=false",
         "word-list-" + k,
         "--path={}".format(filename)],
        check=True)


