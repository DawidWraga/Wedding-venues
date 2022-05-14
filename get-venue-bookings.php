<?php

$conn = mysqli_connect("spryrr1myu6oalwl.chr7pe7iynqr.eu-west-1.rds.amazonaws.com","y21blfp42bybvehd","klclvqvgzdqq368i","ifjq14krys29jh90",3306);
// $conn = mysqli_connect("sci-mysql","coa123wuser","grt64dkh!@2FD","coa123wdb");

if(!$conn) die("Connection failed: ". mysqli_connect_error());


function validate($data) {
  $data = htmlspecialchars($data);
  $data = trim($data);
  $data = stripslashes($data);
  return $data;
}

$checkin =  validate($_GET['checkin']);
$checkout = validate($_GET['checkout']);
$name = validate($_GET['name']);

$sql = "
SELECT booking_date as date 
FROM venue v 
JOIN venue_booking vb on v.venue_id=vb.venue_id 
WHERE 
  booking_date BETWEEN '$checkin' and '$checkout' 
  and name='$name';
";

$result = mysqli_query($conn,$sql);
$data = mysqli_fetch_all($result,MYSQLI_ASSOC);

mysqli_free_result($result);
mysqli_close($conn);

echo json_encode($data)

?>