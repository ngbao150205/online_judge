import prisma from '../config/db';
import { SubmissionStatus } from '@prisma/client';


export const getLeaderboardService = async (
  limit = 100
) => {

  const users = await prisma.user.findMany({

    select: {

      id:true,
      name:true,

      submissions:{
        select:{
          status:true
        }
      }

    }

  });


  const ranking = users.map(user=>{


    const totalSubmissions =
      user.submissions.length;


    const successfulSubmissions =
      user.submissions.filter(
        s =>
        s.status === SubmissionStatus.ACCEPTED
      ).length;


    return {

      id:user.id,

      name:user.name,

      username:
        user.name
          .toLowerCase()
          .replace(/\s+/g,''),


      avatar:
        null,


      successfulSubmissions,

      totalSubmissions,


      accuracy:
        totalSubmissions > 0
        ?
        Math.round(
          successfulSubmissions /
          totalSubmissions *
          100
        )
        :
        0

    };

  });



  return ranking

    .sort(
      (a,b)=>
      b.successfulSubmissions -
      a.successfulSubmissions
    )

    .slice(0,limit);

};