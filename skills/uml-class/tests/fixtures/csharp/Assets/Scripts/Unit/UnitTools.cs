using UnityEngine;

namespace Colonization.Unit
{
    public class UnitTools : MonoBehaviour
    {
        private IMover _mover;
        private IUnitMiner _unitMiner;
        private IUnitStorage _unitStorage;
        private ITaskDistributor _taskDistributor;

        public void Setup(IMover mover, IUnitMiner miner, IUnitStorage storage)
        {
            _mover = mover;
            _unitMiner = miner;
            _unitStorage = storage;
        }
    }
}
