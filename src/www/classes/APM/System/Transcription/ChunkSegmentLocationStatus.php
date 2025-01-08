<?php

namespace APM\System\Transcription;

class ChunkSegmentLocationStatus
{
    const UNDETERMINED = -1;
    const VALID = 0;
    const NO_CHUNK_START = 1;
    const NO_CHUNK_END = 2;
    const CHUNK_START_AFTER_END = 3;
    const DUPLICATE_CHUNK_START_MARKS = 4;
    const DUPLICATE_CHUNK_END_MARKS = 5;
}