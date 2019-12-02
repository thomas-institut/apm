<?php



namespace APM\Core\Person;
/**
 * Basic representation of a person: an entity with one or more ids
 * of different kinds, e.g. a system id, a url, a full name, etc
 * 
 * The idea is that this class can be the base of more specific classes that
 * can be used together with a PeopleDirectory to get information suitable
 * for data display and export.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Person {
    
    private $ids;
    
    const IDTYPE_NONE = '';
    const IDTYPE_FULLNAME = 'fullName';
    
    const ID_NULL = false;
    
    
    public function __construct(string $idType = self::IDTYPE_NONE, $id = self::ID_NULL) {
        $this->ids = [];
        $this->setId($idType, $id);
    }
    
    public function setId(string $idType, $id) : void {
        if ($idType === self::IDTYPE_NONE) {
            return;
        }
        
        if ($id===self::ID_NULL) {
            return;
        }
        
        $this->ids[$idType] = $id;
    }
    
    public function getId(string $idType) {
        return isset($this->ids[$idType]) ? $this->ids[$idType] : self::ID_NULL;
    }
}
