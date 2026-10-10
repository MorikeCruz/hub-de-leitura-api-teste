
/// <reference types="cypress" />

describe('Testes da Funcionalidade Catálogo de Livros', () => {
  let token;

  beforeEach(() => {
    cy.geraToken('admin@biblioteca.com', 'admin123').then((tkn) => {
      token = tkn;
    });
  });

  // Remove o prefixo Bearer caso o comando já o retorne.
  const headersAdmin = () => {
    const tokenLimpo = String(token).replace(/^Bearer\s+/i, '');

    return {
      Authorization: `Bearer ${tokenLimpo}`
    };
  };

  // Gera dados únicos para cada livro de teste.
  const criarDadosLivro = () => {
    const identificador = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const isbn = identificador.slice(-13).padStart(13, '0');

    return {
      title: `Livro de Teste ${identificador}`,
      author: 'Autor de Teste',
      description: 'Livro criado automaticamente pelo Cypress',
      category: 'Literatura Brasileira',
      isbn,
      editor: 'Editora de Testes',
      language: 'Português',
      publication_year: 2020,
      pages: 200,
      format: 'Físico',
      total_copies: 4,
      available_copies: 4
    };
  };

  // GET - Listar livros com filtros e paginação
  it('GET - Deve listar livros com filtros e paginação', () => {
    cy.request({
      method: 'GET',
      url: 'books',
      qs: {
        category: 'Literatura Brasileira',
        author: 'Machado de Assis',
        limit: 5,
        offset: 0,
        orderBy: 'title',
        order: 'ASC'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.books).to.be.an('array');
      expect(response.body).to.have.property('pagination');

      expect(response.body.pagination).to.have.property('total');
      expect(response.body.pagination).to.have.property('showing');
      expect(response.body.pagination).to.have.property('currentPage');
      expect(response.body.pagination).to.have.property('totalPages');

      response.body.books.forEach((livro) => {
        expect(livro.category).to.eq('Literatura Brasileira');
        expect(livro.author).to.include('Machado de Assis');
      });
    });
  });

  // GET - Obter detalhes de um livro específico
  it('GET - Deve obter detalhes de um livro específico', () => {
    cy.request({
      method: 'GET',
      url: 'books/1'
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('book');

      const livro = response.body.book;

      expect(livro.id).to.eq(1);
      expect(livro.title).to.eq('Dom Casmurro');
      expect(livro.author).to.eq('Machado de Assis');
      expect(livro).to.have.property('category');
      expect(livro).to.have.property('isbn');
      expect(livro).to.have.property('available_copies');
    });
  });

  // POST - Cadastrar livro válido
  it('POST - Deve cadastrar um novo livro com sucesso', () => {
    const livro = criarDadosLivro();

    cy.request({
      method: 'POST',
      url: 'books',
      headers: headersAdmin(),
      body: livro
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.message).to.include('Livro criado com sucesso');
      expect(response.body.book).to.have.property('id');
      expect(response.body.book.title).to.eq(livro.title);
      expect(response.body.book.author).to.eq(livro.author);
      expect(response.body.book.category).to.eq(livro.category);
    });
  });

  // POST - Rejeitar dados inválidos
  it('POST - Deve rejeitar livro com dados inválidos', () => {
    cy.request({
      method: 'POST',
      url: 'books',
      headers: headersAdmin(),
      body: {
        title: '',
        author: ''
      },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body).to.have.property('message');
    });
  });

  // PUT - Criar e atualizar livro usando o ID retornado
  it('PUT - Deve atualizar um livro previamente cadastrado', () => {
    const livro = criarDadosLivro();

    cy.request({
      method: 'POST',
      url: 'books',
      headers: headersAdmin(),
      body: livro
    }).then((cadastro) => {
      expect(cadastro.status).to.eq(201);

      const idLivro = cadastro.body.book.id;

      const livroAtualizado = {
        ...livro,
        title: `${livro.title} Atualizado`,
        pages: 250
      };

      cy.request({
        method: 'PUT',
        url: `books/${idLivro}`,
        headers: headersAdmin(),
        body: livroAtualizado,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);

        cy.request({
          method: 'GET',
          url: `books/${idLivro}`
        }).then((consulta) => {
          expect(consulta.status).to.eq(200);
          expect(consulta.body.book.title).to.eq(livroAtualizado.title);
          expect(consulta.body.book.pages).to.eq(250);
        });
      });
    });
  });

  // DELETE - Criar e excluir livro usando o ID retornado
  it('DELETE - Deve deletar um livro previamente cadastrado', () => {
    const livro = criarDadosLivro();

    cy.request({
      method: 'POST',
      url: 'books',
      headers: headersAdmin(),
      body: livro
    }).then((cadastro) => {
      expect(cadastro.status).to.eq(201);

      const idLivro = cadastro.body.book.id;

      cy.request({
        method: 'DELETE',
        url: `books/${idLivro}`,
        headers: headersAdmin(),
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 204]);

        cy.request({
          method: 'GET',
          url: `books/${idLivro}`,
          failOnStatusCode: false
        }).then((consulta) => {
          expect(consulta.status).to.eq(404);
        });
      });
    });
  });
});
