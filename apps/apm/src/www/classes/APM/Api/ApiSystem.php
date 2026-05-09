<?php


namespace APM\Api;

use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserNotFoundException;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\EntitySystem\Tid;

class ApiSystem extends ApiController
{
    const string CLASS_NAME = 'System';

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getSystemLanguages(Request $request,  Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        return $this->responseWithJson($response, $this->systemManager->getConfig()['languages']);
    }

    public function whoAmI(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $userInfo = $this->getSiteUserInfo();
        return $this->responseWithJson($response, $userInfo);
    }

    /**
     *
     * Gets an array with info about the user.
     *
     */
    protected function getSiteUserInfo(): array
    {
        try {
            $userData = $this->systemManager->getUserManager()->getUserData($this->apiUserId);
            $personData = $this->systemManager->getPersonManager()->getPersonEssentialData($this->apiUserId);

            $userInfo = $userData->getExportObject();
            unset($userInfo['passwordHash']);
            $userInfo['name'] = $personData->name;
            $userInfo['email'] = '';
            $userInfo['isRoot'] = $userData->root;
            $userInfo['manageUsers'] = $userData->root;
            $userInfo['tidString'] = Tid::toBase36String($userData->id);
            return $userInfo;
        } catch (UserNotFoundException|PersonNotFoundException $e) {
            $this->logger->error("System Error while getting SiteUserInfo: " . $e->getMessage(), [ 'userId' => $this->apiUserId ]);
            // should never happen
            return [];
        }
    }
}