import prisma from '../config/db';

export const getPublicRoadmapsService = async () => {
  const roadmaps = await prisma.roadmap.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      problems: {
        orderBy: { orderIndex: 'asc' },
        include: {
          problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        },
      },
    },
  });

  return roadmaps.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    totalProblems: r.problems.length,
    problems: r.problems.map((rp) => ({
      ...rp.problem,
      orderIndex: rp.orderIndex,
    })),
  }));
};

export const getStudentRoadmapDetailService = async (
  roadmapId: string,
  userId?: string
) => {

  const roadmap = await prisma.roadmap.findFirst({
    where: {
      id: roadmapId,
      isActive: true,
    },

    include: {

      problems: {
        orderBy:{
          orderIndex:'asc'
        },

        include:{
          problem:{
            select:{
              id:true,
              title:true,
              slug:true,
              difficulty:true,
            }
          }
        }
      },


      // lấy tiến độ của user trong roadmap này
      progress: userId
      ? {
          where:{
            userId
          },

          select:{
            problemId:true,
            isSolved:true,
            solvedAt:true,
          }
        }
      : false

    }
  });
  console.log("USER ID:", userId);

console.log(
  "ROADMAP PROGRESS:",
  roadmap.progress
);


  if(!roadmap){
    throw new Error('ROADMAP_NOT_FOUND');
  }



  const progressMap =
    new Map(
      (roadmap.progress || [])
      .map(p=>[
        p.problemId,
        p
      ])
    );



  let previousSolved = true;


  const formattedProblems =
    roadmap.problems.map((rp,index)=>{


      const progress =
        progressMap.get(
          rp.problemId
        );


      const isSolved =
        progress?.isSolved ?? false;



      const isUnlocked =
        index === 0 ||
        previousSolved;



      previousSolved = isSolved;



      return {

        id:rp.problem.id,

        title:rp.problem.title,

        slug:rp.problem.slug,

        difficulty:rp.problem.difficulty,

        orderIndex:rp.orderIndex,


        isSolved,

        isUnlocked,


        solvedAt:
          progress?.solvedAt ?? null,


        status:
          isSolved
          ? 'COMPLETED'
          : isUnlocked
          ? 'UNLOCKED'
          : 'LOCKED'

      };

    });



  return {

    id:roadmap.id,

    title:roadmap.title,

    description:roadmap.description,


    totalProblems:
      formattedProblems.length,


    completedCount:
      formattedProblems.filter(
        p=>p.isSolved
      ).length,


    problems:
      formattedProblems,

  };

};