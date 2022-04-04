<?php
$conn = mysqli_connect("sci-mysql","coa123wuser","grt64dkh!@2FD","coa123wdb");
if(!$conn) echo "Warning: connection error: ". mysqli_connect_error();

$sql = $_GET['q'];

$result = mysqli_query($conn,$sql);
$data = mysqli_fetch_all($result,MYSQLI_ASSOC);

mysqli_free_result($result);
mysqli_close($conn);

echo json_encode($data)
?>