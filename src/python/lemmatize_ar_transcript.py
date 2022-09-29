import qalsadi.lemmatizer
import sys

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = transcript.replace("#", " ")
transcript = transcript.replace("- ", "")
transcript = transcript.replace("%", "(")
transcript = transcript.replace("$", ")")

# transcript ="يُشار إلى أن اللغة العربية يتحدثها أكثر من 422 مليون نسمة ويتوزع متحدثوها"

# Get tokens
transcript_tokenized = transcript.split(" ")

# Get lemmata
lemmatizer = qalsadi.lemmatizer.Lemmatizer()
transcript_lemmatized = [lemmatizer.lemmatize(t) for t in transcript_tokenized]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(transcript_tokenized))
print('#'.join(transcript_lemmatized))



