describe('General APM functions', () => {
  it('loads user dashboard', () => {

    const username = 'rafael';
    const password = 'sq92-5o=KuHZ';
    cy.visit('/login');
    cy.get('input[name=user]').type(username)

    // {enter} causes the form to submit
    cy.get('input[name=pwd]').type(`${password}{enter}`);
    cy.url().should('include', '/dashboard');


  })
})