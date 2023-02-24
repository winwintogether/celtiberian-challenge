# Celtiberian - Coding Challenge

The goal of the application is to have some working code that can be presented in front of the development team. In order to do that, we are going to ask for a very simple app that has a backend and client. Feel free to use the tools you feel more comfortable with for both (back & front), but hey must be separated and use SPA (Single Page Application).

## TODO

1 -  Build a back-end that allows you to create, read, update and delete a list of titles of newspapers. They must be persisted in the database. Each object will have:
* id
* title
* image (you can use external url or stored files)
* publisher (specific model/schema)
* link (url)
* abstract
* creation date
* languages (multiple are allowed)

2 - Build an interactive web page. The app will use your custom API in order to fetch data. The goal of the app is to look for some terms using the API, and then display the results in a list. This is a sample request, in which we look for the titles of newspapers that contain the term 'michigan'.

3 - Extra

You can add some of this suggested extras.

* A way to populate the DB easily
* Handle API pagination
* Handle API filtering
* Use some beautiful UI components from a library (like [Ant Design](https://ant.design/docs/react/introduce), [React Bootstrap](https://react-bootstrap.github.io/), ...)
* Unit test
* Suggest how to deploy this in a production environment

## Implementation

- [x] Build a backend for CRUD of newspaper
- [x] Build an interactive web page using React & Typescript
- [x] A way to populate the DB using mongoose 
- [x] Handle API pagination using mongoose-paginate-v2
- [x] Handle API filtering using express-validator
- [x] Use some beautiful UI components from [Ant Design](https://ant.design/docs/react/introduce)
- [x] Unit Tests using chai in the backend
- [x] How to deploy this in a production environment