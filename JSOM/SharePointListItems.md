# SharePoint List Items
Simple snippets for working with list items in SharePoint.

## Print list item titles
Gets all items from a list and prints the titles to the log.
```
var listItems;

function printListItemTitles() {
    
    var clientContext = SP.ClientContext.get_current();
    var currentWeb = clientContext.get_web();
    var list = currentWeb.get_lists().getByTitle('MyList');
    var query = SP.CamlQuery.createAllItemsQuery();
    listItems = list.getItems(query);
    clientContext.load(listItems);

    clientContext.executeQueryAsync(
        Function.createDelegate(this, this.onQuerySucceeded), 
        Function.createDelegate(this, this.onQueryFailed))
}

function onQuerySucceeded (sender, args) {
    var itemEnumerator = listItems.getEnumerator();

    while(itemEnumerator.moveNext()) {
        var currentListItem = itemEnumerator.get_current();
        console.log(currentListItem.get_item('Title'));
    }
}

function onQueryFailed (sender, args) {
    console.log("Query failed");
}

SP.SOD.executeFunc('sp.js', 'SP.ClientContext', printListItemTitles);
```