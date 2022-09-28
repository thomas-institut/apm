import simplemma
import sys

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = transcript.replace("#", " ")
# transcript = transcript.replace("\n", " ")
transcript = transcript.replace("- ", "")
transcript = transcript.replace("%", "(")
transcript = transcript.replace("$", ")")

# Get tokens and lemmata
tokens = simplemma.simple_tokenizer(transcript)
lemmata = [simplemma.lemmatize(t, lang='la') for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))

