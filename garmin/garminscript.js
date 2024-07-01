//Requires that an element with the id=garmin is present in the DOM.

// Load sql.js WebAssembly file
let config = {
    locateFile: () => "/garmin/sql-wasm.wasm",
};

var db = null;
var invertSpecificationRequirements = false;
var numberOfProducts = 0;

function startGarminWizard()
{
    document.getElementById("loadingIndicator").style.display = "block";

    tabSupport();

    initSqlJs(config).then(function (SQL) {
        console.log("sql.js initialized 🎉");
        fetch('/garmin/products.db?v=6')
        .then(response => response.arrayBuffer())
        .then(buffer => {
            db = new SQL.Database(new Uint8Array(buffer));
            addGarminWizard();
           // Hide loading indicator when initialization is complete
           document.getElementById("loadingIndicator").style.display = "none";
           document.getElementById("garminwizard").style.display = "block";
        })
        .catch(error => {
            console.error('Error loading database:', error);
            document.getElementById("loadingIndicator").style.display = "none";
            document.getElementById("garminwizard").style.display = "block";
        });
    });
}
function addGarminWizard() {
    populateNumberOfUniqueProducts();
    populateNumberOfUniqeSpecifications();

    // Execute a query to retrieve distinct product specs
    var result = db.exec("SELECT specGroupKeyDisplayName, specKey, specValue, specDisplayName, specDisplayValue FROM products GROUP BY specGroupKeyDisplayName, specKey, specValue ORDER BY specGroupKeyDisplayName, specKey");

    groupedSpecs = groupProductSpecsBySpecGroupKeyDisplayName(result);

    CreateControlButtons();

    iterateOverTheGroupedSpecsAndCreateHTMLElements(groupedSpecs);
    PopulateMatchingProductResults();
}

// Generate HTML elements for product specs
// An element with the id "garmin" must be present in the DOM.
function iterateOverTheGroupedSpecsAndCreateHTMLElements(groupedSpecs)
{
    var container = document.getElementById("garmin");

    let previousSpeckey = null; // Variable to track the previous speckey
    let colorIndex = 0; // Index for alternating background colors
    let rowId = 0;

    Object.entries(groupedSpecs).forEach(([groupName, specs]) => {
        var titleElement = document.createElement('h3');
        titleElement.textContent = groupName;
        titleElement.classList.add("garmintitle");
    
        var badge = document.createElement('span');
        badge.style.display = 'none'; // Hide the badge
        badge.classList.add('garminbadge');
        badge.textContent = '0';
        badge.setAttribute('data-group', groupName); // Assigning the data-group attribute
    
        titleElement.appendChild(badge);
        
        titleElement.addEventListener('click', function () {
            const content = this.nextElementSibling;
            content.classList.toggle('garminexpanded');
            content.classList.toggle('garmincollapsed');
            // Toggle class for rotating the arrow
            this.classList.toggle('garmin-expanded-arrow');
        });
    
        container.appendChild(titleElement);
    
        // Add div to wrap content
        var contentWrapper = document.createElement('div');
        contentWrapper.classList.add('garmincollapsed');
        contentWrapper.classList.add('content');
        container.appendChild(contentWrapper);
    
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        specs.forEach(spec => {
            rowId++;
            var row = document.createElement('tr');
            var cell1 = document.createElement('td');
    
            var cell3 = document.createElement('td');
    
            var cell4 = document.createElement('td');
            var specDisplayValue = document.createElement('div');
            specDisplayValue.innerHTML = spec.specdisplayvalue; 
            cell4.appendChild(specDisplayValue);
    
            var cell4ResultTitle = document.createElement('div');
            cell4ResultTitle.innerHTML = "<span>Products with specification</span>";
            cell4ResultTitle.classList.add('garmintitle-without-content');
    
            var cell4Result = document.createElement('div');
            cell4Result.setAttribute("id", "row" + rowId + "resultCell");
            cell4Result.classList.add('garmincollapsed');

            var cell4InvertedResultTitle = document.createElement('div');
            cell4InvertedResultTitle.innerHTML = "<span>Products without specification</span>";
            cell4InvertedResultTitle.classList.add('garmintitle-without-content');

            var cell4InvertedResult = document.createElement('div');
            cell4InvertedResult.setAttribute("id", "row" + rowId + "invertedResultCell");
            cell4InvertedResult.classList.add('garmincollapsed');

            cell4.appendChild(cell4ResultTitle);
            cell4.appendChild(cell4Result);
            cell4.appendChild(cell4InvertedResultTitle);
            cell4.appendChild(cell4InvertedResult);
    
            cell4ResultTitle.addEventListener('click', function () {
                const content = this.nextElementSibling;
                content.classList.toggle('garminexpanded');
                content.classList.toggle('garmincollapsed');
                // Toggle class for rotating the arrow
                this.classList.toggle('garmin-expanded-arrow');

                if (!content.classList.contains('garminhasbeenexpanded')) 
                {
                    content.classList.add("garminhasbeenexpanded");
                    PopulateCellWithProducts(cell4Result, spec.speckey, spec.specvalue);
                }
            });            

            cell4InvertedResultTitle.addEventListener('click', function () {
                const content = this.nextElementSibling;
                content.classList.toggle('garminexpanded');
                content.classList.toggle('garmincollapsed');
                // Toggle class for rotating the arrow
                this.classList.toggle('garmin-expanded-arrow');

                if (!content.classList.contains('garminhasbeenexpanded')) 
                {
                    content.classList.add("garminhasbeenexpanded");
                    PopulateCellWithInvertedProducts(cell4InvertedResult, spec.speckey, spec.specvalue);
                }
            });

            var checkbox = CreateCheckbox(spec.speckey, spec.specvalue, groupName);
            checkbox.addEventListener('change', function() {
                updateBadgeCount(groupName); // Update badge count when checkbox state changes
        
                if (checkbox.checked) {
                    cell4ResultTitle.classList.remove('garmintitle-without-content');
                    cell4ResultTitle.classList.add('garmintitle-with-content');
                    cell4InvertedResultTitle.classList.remove('garmintitle-without-content');
                    cell4InvertedResultTitle.classList.add('garmintitle-with-content');
                } else {
                    cell4ResultTitle.classList.remove('garmintitle-with-content');
                    cell4ResultTitle.classList.add('garmintitle-without-content');
                    cell4InvertedResultTitle.classList.remove('garmintitle-with-content');
                    cell4InvertedResultTitle.classList.add('garmintitle-without-content');
                    cell4Result.classList.remove('garminexpanded');
                    cell4Result.classList.add('garmincollapsed');
                    cell4InvertedResult.classList.remove('garminexpanded');
                    cell4InvertedResult.classList.add('garmincollapsed');
                }
                PopulateMatchingProductResults();
            });
        
        
            cell1.appendChild(checkbox);
            cell3.innerHTML = spec.specdisplayname;
            row.appendChild(cell1);
            
            // Uncomment to get specKey in separate column
            // row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);
    
            // Apply alternating background color based on speckey
            if (previousSpeckey !== spec.speckey) {
                colorIndex = 1 - colorIndex; // Toggle color index
            }
            row.style.backgroundColor = colorIndex === 0 ? '#aaf0aa' : '#00e000'; // Apply color
            previousSpeckey = spec.speckey; // Update previous speckey
    
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        contentWrapper.appendChild(table);
        contentWrapper.appendChild(document.createElement('br')); // Add line break between tables
    });
}

function groupProductSpecsBySpecGroupKeyDisplayName(result) {

    var groupedSpecs = {};
    result[0].values.forEach(row => {
        var spec = {
            SpecGroupKeyDisplayName: row[0],
            speckey: row[1],
            specvalue: row[2],
            specdisplayname: row[3],
            specdisplayvalue: row[4]
        };
        if (!groupedSpecs[spec.SpecGroupKeyDisplayName]) {
            groupedSpecs[spec.SpecGroupKeyDisplayName] = [];
        }
        groupedSpecs[spec.SpecGroupKeyDisplayName].push(spec);
    });
    return groupedSpecs;
}

function createProductResultCheckbox(productId)
{
    var checkbox = document.createElement('input');
    checkbox.classList.add("garmin-checkbox");
    checkbox.classList.add("garmin-product-result-checkbox");
    checkbox.type = 'checkbox';
    checkbox.value = productId;
    return checkbox;     
}

function CreateCheckbox(key, value, groupName) {
    var checkbox = document.createElement('input');
    checkbox.classList.add("garmin-checkbox");
    checkbox.classList.add("garmin-specification-checkbox");
    checkbox.type = 'checkbox';
    checkbox.value = key;
    checkbox.setAttribute('data-group', groupName); // Assigning the data-group attribute
    checkbox.setAttribute('data-value', value);
    return checkbox;     
}

function CreateControlButtons()
{
    var expandAllButton = document.getElementById('expand-all-button');
    var collapseAllButton = document.getElementById('collapse-all-button');
    var checkAllButton = document.getElementById('check-all-button');
    var uncheckAllButton = document.getElementById('uncheck-all-button');

    expandAllButton.addEventListener('click', expandAll);
    collapseAllButton.addEventListener('click', collapseAll);
    checkAllButton.addEventListener('click', CheckAll);
    uncheckAllButton.addEventListener('click', UnCheckAll);
}

function createCheckboxToInvertSpecificationRequirements()
{
    var checkbox = document.createElement('input');
    checkbox.classList.add("garmin-checkbox");
    checkbox.type = 'checkbox';
    checkbox.addEventListener('click',function() {
        if (checkbox.checked) {
            invertSpecificationRequirements = true;
        } else {
            invertSpecificationRequirements = false;
        }
        updateAllResults();
    });

    var invertCheckboxElement = document.getElementById('invert-checkbox');
    invertCheckboxElement.appendChild(checkbox);
}


// Function to expand all tables
function expandAll() {
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('garmincollapsed');
        content.classList.add('garminexpanded');
    });
}

// Function to collapse all tables
function collapseAll() {
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('garminexpanded');
        content.classList.add('garmincollapsed');
    });
}

function CheckAll() {
    var selectedCheckBoxes = getAllSpecificationCheckBoxes();

    var previousGroupName = "";
    var currentGroupName = "";
    var firstGroup = true;
    var checkBoxesInGroup = 0;
    selectedCheckBoxes.forEach(checkbox => {
        checkbox.checked = true; 
        checkBoxesInGroup++;
        currentGroupName = checkbox.getAttribute("data-group");
        if(firstGroup == true)
        {
            firstGroup = false;
            previousGroupName = currentGroupName;
        }
        if( currentGroupName != previousGroupName)
        {
            UpdateBadgeCountWithNumber(previousGroupName, checkBoxesInGroup);
            previousGroupName = currentGroupName;
            checkBoxesInGroup = 0;
        }
    });
    UpdateBadgeCountWithNumber(currentGroupName, checkBoxesInGroup);

    PopulateMatchingProductResults();
}

function UnCheckAll() {
    var selectedCheckBoxes = getAllSpecificationCheckBoxes();
    var previousGroupName = "";
    selectedCheckBoxes.forEach(checkbox => {
        checkbox.checked = false; 
        var currentGroupName = checkbox.getAttribute("data-group");
        if( currentGroupName != previousGroupName)
        {
            UpdateBadgeCountWithNumber(currentGroupName, 0);
            previousGroupName = currentGroupName;
        }
    });
    PopulateMatchingProductResults();
}

function UpdateBadgeCountWithNumber(groupName, number)
{
    const badge = document.querySelector(`.garminbadge[data-group="${groupName}"]`);
    if (number > 0) {
        badge.textContent = number;
        badge.style.display = 'inline-block'; // Show the badge
    } else {
        badge.style.display = 'none'; // Hide the badge
    }    
}

// Function to update badge count
function updateBadgeCount(groupName) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-group="${groupName}"]`);

    let selectedCount = 0;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedCount++;
        }
    });
    UpdateBadgeCountWithNumber(groupName, selectedCount);
}

function populateNumberOfUniqueProducts()
{
    var result = db.exec("SELECT COUNT(DISTINCT productId) AS NumberOfProducts FROM products;");
    numberOfProducts = result[0].values[0];
    console.log(`Number of products:${numberOfProducts}`);
    var div = document.getElementById("productCountPlaceholder");
    div.innerHTML += numberOfProducts;

}
function populateNumberOfUniqeSpecifications()
{
    var result = db.exec("SELECT COUNT(DISTINCT specKey) AS NumberOfSpecifications FROM products;");
    var numberOfSpecifications = result[0].values[0];
    console.log(`Number of products:${numberOfSpecifications}`);
    var div = document.getElementById("specificationCountPlaceholder");
    div.innerHTML += numberOfSpecifications;
}

function PopulateCellWithProducts(element, speckey, specvalue) {
    var finalQuery = `SELECT productId, displayName, productUrl, price FROM products where specKey="${speckey}" and specValue="${specvalue}" order by price asc`;

    console.log(finalQuery);
    var result = db.exec(finalQuery);

    result[0].values.forEach(row => {
        var price = getFormattedPrice(row[3]);
        element.innerHTML += `<a target="_blank" href="${row[2]}">${row[1]}</a> ${price}<br/>`;
    });
}

function getFormattedPrice(unformattedPrice)
{
    var price = unformattedPrice;
    if(price == null)
    {
        price = "-";
    }
    else
    {
        price = "$" + price + " USD";
    }
    return price;
}
function PopulateCellWithInvertedProducts(element, speckey, specvalue) {
    var finalQuery = getBeginInversion();

    finalQuery += `SELECT productId, displayName, productUrl FROM products where specKey="${speckey}" and specValue="${specvalue}" order by price asc`;

    finalQuery += getEndInversion();

    console.log(finalQuery);
    var result = db.exec(finalQuery);

    result[0].values.forEach(row => {
        var price = getFormattedPrice(row[3]);
        element.innerHTML += `<a target="_blank" href="${row[2]}">${row[1]}</a> ${price}<br/>`;
    });
}

function updateMatchingProductsBadge(noOfProducts)
{
    var badge = document.getElementById("matchingProducts");
    badge.classList.remove("garminbadgehidden");
    badge.classList.add("garminbadge");
    badge.textContent = noOfProducts;
}

function updateNumberOfUniqueSpecsBadge(noOfUniqueSpecs)
{
    var badge = document.getElementById("numberOfUniqueSpecs");
    badge.classList.remove("garminbadgehidden");
    badge.classList.add("garminbadge");
    badge.textContent = noOfUniqueSpecs;
}

function PopulateMatchingProductResults() 
{
    // Create a result container to display matching products
    var resultContainer = document.getElementById('garmin-result');
    resultContainer.innerHTML = '';

    // Get the checked speckeys
    const checkedSpecs = {};
    var selectedCheckBoxes = getAllCheckedSpecificationCheckBoxes();

    var sqlQuery = "";
    if(selectedCheckBoxes.length == 0) 
    {
        sqlQuery = `SELECT productId, displayName, productUrl, price
        FROM products
        GROUP BY productId
        ORDER BY price`;
        updateNumberOfUniqueSpecsBadge(0);
    } 
    else 
    {
        selectedCheckBoxes.forEach(checkbox => {
            const group = checkbox.getAttribute('data-group');
            if (!checkedSpecs[group]) {
                checkedSpecs[group] = {};
            }
    
            const speckey = checkbox.value;
            if (!checkedSpecs[group][speckey]) {
                checkedSpecs[group][speckey] = [];
            }
            checkedSpecs[group][speckey].push(checkbox.getAttribute('data-value'));
        });
    
        var result = generateTheQueryAcrossAllSpecificationGroups(checkedSpecs);
        sqlQuery = result.sqlQuery;
        updateNumberOfUniqueSpecsBadge(result.numberOfUniqueSpecs);
    }

    // Use sqlQuery in the fetch call to get the desired results
    console.log(sqlQuery);
    var matchingProducts = db.exec(sqlQuery);
    
    // Clear previous results
    resultContainer.innerHTML = '';
    if(matchingProducts.length == 0)
    {
        resultContainer.innerHTML = 'Could not find any matching products';
        updateMatchingProductsBadge(0);
    }
    else
    {
        var resultDiv = document.createElement('div');
        matchingProducts[0].values.forEach(row => {
            var price = getFormattedPrice(row[3]);
            var matchingProductCheckbox = createProductResultCheckbox(row[0]);
            matchingProductCheckbox.addEventListener('change', updateCompareButtonState);
            resultDiv.appendChild(matchingProductCheckbox);
            var matchingProductDiv = document.createElement('span');
            resultDiv.appendChild(matchingProductDiv);
            matchingProductDiv.innerHTML += `<a target="_blank" href="${row[2]}">${row[1]}</a> ${price}<br/>`;
        });
    
        resultContainer.appendChild(resultDiv);
        var compareButton = createCompareButton();
        resultContainer.appendChild(compareButton);

        var comparisonLink = document.createElement('span');
        comparisonLink.setAttribute('id', 'comparisonLink');
        resultContainer.appendChild(comparisonLink);
        updateMatchingProductsBadge(matchingProducts[0].values.length);
    }
}

function getAllCheckedSpecificationCheckBoxes() 
{
    return document.querySelectorAll('input[type="checkbox"].garmin-specification-checkbox:checked');    
}

function getAllUnCheckedSpecificationCheckBoxes() 
{
    return document.querySelectorAll('input[type="checkbox"].garmin-specification-checkbox:not(:checked)');
}

function getAllSpecificationCheckBoxes() 
{
    return document.querySelectorAll('input[type="checkbox"].garmin-specification-checkbox');
}

function generateTheQueryAcrossAllSpecificationGroups(checkedSpecs) 
{
    let finalQuery = '';

    if(invertSpecificationRequirements)
    {
        finalQuery = getBeginInversion();
    }

    let numberOfUniqueSpecs = 0
    var query = '';
    Object.values(checkedSpecs).forEach((spec, groupIndex) => {
        if (groupIndex > 0) {
            query += ' OR ';
        }

        query += '(';
        Object.entries(spec).forEach(([speckey, values], specIndex) => 
        {
            numberOfUniqueSpecs++;
            if(specIndex > 0) {
                query += ' OR ';
            }
            values.forEach((value, index) => 
            {
                if (index > 0) {
                    query += ' OR ';
                }
                query += `(specKey = '${speckey}' AND specValue = '${value}')`;
            });
        });
        query += ')';
    });

    finalQuery += `
    SELECT productId, displayName, productUrl, price
    FROM products
    WHERE ${query}
    GROUP BY displayName
    HAVING COUNT(specKey) = ${numberOfUniqueSpecs}
    ORDER BY price
    `;

    if(invertSpecificationRequirements)
    {
        finalQuery += getEndInversion();
    }
    return {sqlQuery: finalQuery, numberOfUniqueSpecs: numberOfUniqueSpecs};    
}

function getBeginInversion()
{
    return `SELECT p.productId, p.displayName, p.productUrl, p.price
    FROM products p
    LEFT JOIN (`;    
}

function getEndInversion()
{
    return `) hasSpecifications ON p.productId = hasSpecifications.productId
    WHERE hasSpecifications.productId is null
    GROUP BY p.displayName ORDER by p.price;`    
}

function ClearCell(element) {
    element.innerHTML = "";
}


function tabSupport()
{
    // Get all tab buttons and tab contents
    var tabButtons = document.querySelectorAll('.tablinks');
    var tabContents = document.querySelectorAll('.tabcontent');

    // Add click event listener to each tab button
    tabButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var pageName = this.getAttribute('data-page');

            // Hide all tab contents
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });

            // Remove 'active' class from all tab buttons
            tabButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });

            // Display the clicked tab content and mark the button as active
            document.getElementById(pageName).style.display = 'block';
            this.classList.add('active');
        });
    });
    var tab1 = document.getElementById('defaultOpen');
    tab1.click();
}
// Function to create the button
function createCompareButton() {
    const button = document.createElement('button');
    button.textContent = 'Select up to 5 products to compare';
    button.id = 'compareButton';
    button.disabled = true; // Initially disabled
    button.classList.add('big-button');
    button.addEventListener('click', compareProducts); // Attach click event listener
    document.body.appendChild(button); // Append button to the body (you can change the parent element)

    return button;
}

function getAllProductResultCheckBoxes() 
{
    return document.querySelectorAll('input[type="checkbox"].garmin-product-result-checkbox:checked');    
}


// Function to handle checkbox changes and update button state
function updateCompareButtonState() {
    const compareButton = document.getElementById('compareButton');
    const checkedCheckboxes = getAllProductResultCheckBoxes();

    var comparisonLink = document.getElementById('comparisonLink');
    comparisonLink.innerHTML = '';

    if (checkedCheckboxes.length > 5) {
        compareButton.disabled = true;
        compareButton.textContent = "Maximum of 5 checkboxes can be selected for comparison.";
    } else {
        compareButton.disabled = false;
        compareButton.textContent = "Compare products";
    }
}

// Function to handle button click
function compareProducts() {
    var selectedProductResultCheckboxes = getAllProductResultCheckBoxes();
    var compareUrl = "https://www.garmin.com/en-US/compare/?compareProduct=";
    selectedProductResultCheckboxes.forEach(function(checkbox, index) {
        compareUrl += checkbox.value;
        if (index < selectedProductResultCheckboxes.length - 1) {
            compareUrl += '&compareProduct=';
        }
    });
    const compareButton = document.getElementById('compareButton');
    compareButton.disabled = true;

    var comparisonLink = document.getElementById('comparisonLink');
    const link = document.createElement('a');
    link.href = compareUrl;
    link.target = "_blank";
    link.textContent = "See the comparison on Garmin's page";
    comparisonLink.appendChild(link);
    console.log("Compare url: " + compareUrl);
}

