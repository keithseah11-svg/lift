# Hawker System – Sequence Diagrams (ECB)

Sequence diagrams derived from `Hawker_Classdiagram_Lab3`, using the
Entity–Control–Boundary stereotypes from the class diagram.

Paste the contents of any `.txt` file into https://sequencediagram.org/ to render it.

| File | Use case | Boundary | Control |
|---|---|---|---|
| `01_register_login.txt` | Register / Login | AccountUI | AccountController |
| `02_search_view_stalls.txt` | Search stalls & view details | StallUI | StallController |
| `03_create_update_listing.txt` | Create / update stall listing | StallUI | StallController |
| `04_calculate_viability.txt` | Calculate viability | StallUI | StallController |
| `05_submit_application.txt` | Submit / withdraw application | ApprenticeshipUI | ApprenticeshipController |
| `06_review_application_create_match.txt` | Review application & create match | ApprenticeshipUI | ApprenticeshipController |
| `07_update_progress.txt` | Update apprenticeship progress | ApprenticeshipUI | ApprenticeshipController |
| `08_send_message.txt` | Send message | CommunicationUI | CommunicationController |
| `09_retrieve_knowledge_content.txt` | Retrieve knowledge content | CommunicationUI | CommunicationController |

ECB rules followed: actors talk only to boundaries, boundaries talk to
controls, and controls create/update entities. `AccessController.checkAccess`
and the `DataManager` singleton (`getInstance`/`saveData`/`loadData`) are
called from the controllers.
