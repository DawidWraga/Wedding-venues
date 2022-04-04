<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wedding Venue Bookings</title>
  <link href="./styles.css" rel="stylesheet" type="text/css" />
  <script>
  // <?php
  // echo "console.log('PHP IN SCRIPT WORKING');";

  // $conn = mysqli_connect("sci-mysql","coa123wuser","grt64dkh!@2FD","coa123wdb");
  // if(!$conn) echo "Warning: connection error: ". mysqli_connect_error();

  // $sql = "SELECT * FROM `venue`";
  // $result = mysqli_query($conn,$sql);
  // $data = mysqli_fetch_all($result,MYSQLI_ASSOC);

  // mysqli_free_result($result);
  // mysqli_close($conn);

  // echo "let data = " . json_encode($data) .";";


  // ?>

  // console.table(data)
  </script>
  <script src="./script.js" defer></script>
</head>

<body>
  <h1> Welcome! </h1>
  <!-- <?php echo "test"; ?>
  <?php
  function createTable($matrix){

  echo "<table class='dataTable'>";

    forEach($matrix[0] as $head=>$_) echo "<th>$head</th>";

    forEach($matrix as $i=>$row){
    echo "<tr>";
      $cellType = 1+$i%2;
      forEach($row as $cell) echo "<td class='cell$cellType'>$cell</td>";
      echo "</tr>";
    };

    echo "</table>";
  };

  if ($data) {
  createTable($data);
  } else {
  echo "<p class='center'>no results for this query.</p>";
  };
  ?> -->

  <button id="btn">press me</button>
</body>

</html>