import EntityLink from "@/ReactAPM/Components/EntityLink";

interface PersonLinkProps {
  personId: number;
  name?: string;
  active?: boolean;
}

/**
 *
 * Displays a link to a person's page
 *
 */
export default function PersonLink(props: PersonLinkProps) {

  return (<EntityLink id={props.personId} type='person' name={props.name} active={props.active} />);
}