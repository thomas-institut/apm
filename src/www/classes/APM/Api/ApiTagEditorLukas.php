<?php

namespace APM\Api;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;

class ApiTagEditorLukas extends ApiController
{
    public function saveTagsAsHints (Request $request, Response $response): Response {

        $status = 'OK';
        $now = TimeString::now();
        $tags = $_POST['tags'];

        foreach ($tags as $tag) {
            $this->saveTagInSql($tag);
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'now' => $now,
            'tags' => $tags,
        ]);
    }

    private function saveTagInSql(string $tag): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH WRITES THE TAGS GIVEN AS ARGUMENTS INTO A SQL TABLE

        $cache = $this->systemManager->getSystemDataCache();

        try {
            $next_tag_id = unserialize($cache->get('Next_Tag_ID'));
            $cachedTags = $this->getAllTagsFromSql();
        } catch (KeyNotInCacheException) {
            $next_tag_id = 0;
            $cachedTags = [];
            $cache->set('Next_Tag_ID', serialize($next_tag_id));
        }

        if (in_array($tag, $cachedTags) === false && $tag != '') {
            $cacheKey = 'tag'. $next_tag_id;
            $cache->set($cacheKey, serialize($tag));
            $cache->set('Next_Tag_ID', serialize($next_tag_id+1));
        }

        return true;
    }

    public function getAllTags(Request $request, Response $response): Response
    {

        $status = 'OK';
        $now = TimeString::now();
        $tags = $this->getAllTagsFromSql();

        if ($tags === []) {
            $status = 'Error in Cache!';
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'serverTime' => $now,
            'tags' => $tags]);
    }

    private function getAllTagsFromSql() {

        $tags = [];

        // Get number of tags
        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'Next_Tag_ID';

        try {
            $num_tags = unserialize($cache->get($cacheKey)) - 1;
        }
        catch (KeyNotInCacheException) {
            $num_tags = 0;
        }

        for ($id=0; $id<=$num_tags; $id++) {
            $tags[] = $this->getTagFromSql($id);
        }

        return $tags;
    }

    private function getTagFromSql(string $id): string {

        // TO DO | PLACE HERE A FUNCTION WHICH GETS DATA BY ID FROM A SQL TABLE

        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'tag' . $id;
        try {
            $tag = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $this->logger->debug($id);
        }

        return $tag;
    }
}