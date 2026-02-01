import { db } from "./initialize-firestore.js";

const bookList = document.querySelector("#bookList");

function databaseGetBook() {
  db.collection("books")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        loadBooks(doc.data(), doc.id);
      });
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
  }

function loadBooks(book, bookId) {
  const date = book.createdDate.toDate();

  let day = date.getDate();

  let month = date.getMonth();

  let year = date.getFullYear();

  let html = `
  <div class="col-md-4">
  <div class="card mb-4 shadow-sm"><img class="bd-placeholder-img"width="100%" height="225"
      src="assets/${book.image.path}">
    <div class="card-body">
      <p class="card-text"><b>${book.buchName}</b></p>
      <p class="card-text">Author: ${book.author}<br></p>
      <div class="d-flex justify-content-between align-items-center">
        <div class="btn-group">
          <button type="button" class="btn btn-sm btn-outline-secondary" id="${bookId}">View</button>
        </div>
        <div><i class="fa-solid bi bi-star fa-fw"></i>${book.buchBewertung}</div>
        <small>${day}.${month}.${year}</small>
      </div>
    </div>
  </div>
</div>
    `;
  bookList.innerHTML += html;
  const viewButton = document.querySelector(`#${bookId}`);

  viewButton.addEventListener("click", event => {
    handleViewButtonClickEvent(bookId);
  });
}


function handleViewButtonClickEvent(bookId) {
  location.href = `sites/books/bookDetails.html?id=${bookId}`;
  console.log("Geroutet nach: " + bookId);
}


databaseGetBook();


