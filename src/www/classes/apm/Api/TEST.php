<?php

#$searched_phrase = json_encode('אני יודע');
#$searched_phrase = json_decode($searched_phrase);

$searched_phrase = 'אני יודע';

print_r($searched_phrase);

exec("python3 /home/lukas/apm/src/python/Lemmatizer_Query.py $searched_phrase", $tokens_and_lemmata);

$tokens_queried = explode("#", $tokens_and_lemmata[0]);
$lemmata = explode("#", $tokens_and_lemmata[1]);

print_r ($tokens_queried);
print_r ($lemmata);
