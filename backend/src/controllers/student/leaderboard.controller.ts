import {Request, Response} from 'express';
import {
 getLeaderboardService
} from '../../services/leaderboard.service';


export const getLeaderboard =
async(
 req:Request,
 res:Response
)=>{

 try {

  const limit =
    Number(req.query.limit) || 100;


  const data =
    await getLeaderboardService(limit);


  return res.json({

    success:true,

    data

  });


 }
 catch(error){

  console.error(
    "Leaderboard error:",
    error
  );


  return res.status(500).json({

    success:false,

    message:
    "Không thể lấy bảng xếp hạng"

  });

 }

};