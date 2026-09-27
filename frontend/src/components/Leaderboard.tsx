import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Star,
  Medal,
  Award,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';


export interface UserRank {

  id: string;

  name: string;

  username: string;

  avatar?: string | null;

  successfulSubmissions: number;

  totalSubmissions: number;

  accuracy: number;

}



export const Leaderboard: React.FC = () => {

  const { t } = useLanguage();


  const [users,setUsers] =
    useState<UserRank[]>([]);


  const [loading,setLoading] =
    useState(true);


  const [error,setError] =
    useState<string | null>(null);


  const [searchTerm,setSearchTerm] =
    useState('');



  useEffect(()=>{

    const fetchLeaderboard = async()=>{

      try {

        setLoading(true);

        const response =
          await api.get('/leaderboard');


        setUsers(
          response.data.data || []
        );


      }
      catch(err){

        console.error(
          'Leaderboard error:',
          err
        );


        setError(
          'Không thể tải bảng xếp hạng'
        );

      }
      finally{

        setLoading(false);

      }

    };


    fetchLeaderboard();


  },[]);



  const sortedUsers =
    useMemo(()=>{

      return [...users].sort(
        (a,b)=>
          b.successfulSubmissions -
          a.successfulSubmissions
      );

    },[users]);



  const filteredUsers =
    useMemo(()=>{

      return sortedUsers.filter(user=>{

        const keyword =
          searchTerm.toLowerCase();


        return (

          user.name
            .toLowerCase()
            .includes(keyword)

          ||

          user.username
            .toLowerCase()
            .includes(keyword)

        );

      });


    },[
      sortedUsers,
      searchTerm
    ]);



  const top1 = sortedUsers[0];
  const top2 = sortedUsers[1];
  const top3 = sortedUsers[2];



  if(loading){

    return (

      <div className="
        py-20
        flex
        flex-col
        items-center
        justify-center
        gap-3
        text-slate-500
      ">

        <Loader2
          className="
          w-8
          h-8
          animate-spin
          text-blue-600
          "
        />

        <span className="text-xs font-bold">

          {t(
            'Đang tải bảng xếp hạng...',
            'Loading leaderboard...'
          )}

        </span>

      </div>

    );

  }



  if(error){

    return (

      <div className="
        max-w-md
        mx-auto
        mt-10
        p-5
        rounded-xl
        bg-rose-50
        border
        border-rose-200
        text-rose-700
        flex
        gap-3
      ">

        <AlertCircle/>

        <span>
          {error}
        </span>


      </div>

    );

  }



  const renderAvatar = (
    user:UserRank,
    size='w-16 h-16'
  )=>{


    return user.avatar ? (

      <img
        src={user.avatar}
        alt={user.name}
        className={`
          ${size}
          rounded-full
          object-cover
        `}
      />

    ) : (

      <div
        className={`
          ${size}
          rounded-full
          bg-blue-100
          text-blue-700
          flex
          items-center
          justify-center
          font-black
        `}
      >

        {
          user.name
          .charAt(0)
          .toUpperCase()
        }

      </div>

    );

  };



  const PodiumCard = ({
    user,
    rank
  }:{
    user?:UserRank;
    rank:number;
  })=>{


    if(!user)
      return null;


    return (

      <div
        className={`
        bg-white
        dark:bg-slate-900
        border
        rounded-2xl
        p-5
        flex
        flex-col
        items-center
        text-center
        relative
        ${
          rank===1
          ?
          'border-amber-400'
          :
          'border-slate-200'
        }
        `}
      >

        <div className="
          absolute
          -top-3
          px-3
          py-1
          rounded-full
          text-[10px]
          font-black
          bg-amber-100
          text-amber-700
        ">

          {
            rank===1
            ?
            '🏆 Champion'
            :
            `#${rank}`
          }

        </div>


        {
          renderAvatar(
            user,
            rank===1
            ?
            'w-20 h-20'
            :
            'w-16 h-16'
          )
        }


        <h3 className="
          mt-3
          font-black
          text-sm
          text-slate-900
          dark:text-white
        ">

          {user.name}

        </h3>


        <p className="
          text-xs
          text-slate-400
        ">
          @{user.username}
        </p>


        <div className="
          mt-3
          flex
          items-center
          gap-1
          px-3
          py-1
          rounded-full
          bg-amber-500/10
          text-amber-600
          font-black
        ">

          <Star
            className="
            w-4
            h-4
            fill-amber-500
            "
          />

          {user.successfulSubmissions}

        </div>


      </div>

    );

  };



  return (

    <div className="
      max-w-6xl
      mx-auto
      space-y-6
    ">


      <div className="text-center">

        <div className="
          inline-flex
          items-center
          gap-2
          px-3
          py-1
          rounded-full
          bg-amber-500/10
          text-amber-600
          text-xs
          font-bold
        ">

          <Trophy className="w-4 h-4"/>

          {t(
            'Bảng Xếp Hạng Học Viên',
            'Student Leaderboard'
          )}

        </div>


        <h1 className="
          mt-3
          text-3xl
          font-black
        ">

          {t(
            'Vinh Danh Cao Thủ',
            'Honor Roll'
          )}

        </h1>


        <p className="
          text-xs
          text-slate-500
        ">

          Accepted submission = ⭐

        </p>

      </div>




      <div className="
        grid
        md:grid-cols-3
        gap-4
      ">

        <PodiumCard
          user={top2}
          rank={2}
        />


        <PodiumCard
          user={top1}
          rank={1}
        />


        <PodiumCard
          user={top3}
          rank={3}
        />

      </div>




      <div className="relative">


        <Search
          className="
          absolute
          left-3
          top-3
          w-4
          h-4
          text-slate-400
          "
        />


        <input

          value={searchTerm}

          onChange={
            e=>setSearchTerm(
              e.target.value
            )
          }

          placeholder={
            t(
              'Tìm kiếm người dùng...',
              'Search user...'
            )
          }


          className="
          w-full
          pl-10
          py-2
          rounded-xl
          border
          bg-white
          dark:bg-slate-900
          text-sm
          "

        />


      </div>





      <div className="
        bg-white
        dark:bg-slate-900
        rounded-2xl
        border
        overflow-hidden
      ">


        <table className="
          w-full
          text-sm
        ">


          <thead>

            <tr className="
              bg-slate-50
              dark:bg-slate-950
              text-xs
              text-slate-400
            ">

              <th className="p-4">
                Rank
              </th>

              <th className="p-4 text-left">
                User
              </th>


              <th className="p-4">
                Accuracy
              </th>


              <th className="p-4">
                ⭐
              </th>


            </tr>

          </thead>



          <tbody>


          {
            filteredUsers.map(
              (user,index)=>(
              
              <tr
                key={user.id}
                className="
                border-t
                hover:bg-slate-50
                "
              >

                <td className="
                  p-4
                  text-center
                  font-black
                ">

                  #{index+1}

                </td>


                <td className="p-4">

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">


                    {
                      renderAvatar(
                        user,
                        'w-8 h-8'
                      )
                    }


                    <div>

                      <p className="
                        font-bold
                      ">

                        {user.name}

                      </p>


                      <p className="
                        text-xs
                        text-slate-400
                      ">

                        @{user.username}

                      </p>


                    </div>


                  </div>


                </td>


                <td className="
                  p-4
                  text-center
                ">


                  {user.accuracy}%


                </td>


                <td className="
                  p-4
                  text-center
                  font-black
                  text-amber-600
                ">


                  ⭐ {user.successfulSubmissions}


                </td>


              </tr>


              )
            )
          }


          </tbody>


        </table>


      </div>


    </div>

  );

};


export default Leaderboard;